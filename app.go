package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	_ "modernc.org/sqlite"
)

// App struct
type App struct {
	ctx           context.Context
	uploadCmd     *exec.Cmd
	uploadStdin   io.WriteCloser
	uploadMutex   sync.Mutex
	isUploading   bool
	primateCmd    *exec.Cmd
	primateMutex  sync.Mutex
	isUploading2  bool
	db            *sql.DB
}

type AppSettings struct {
	UAPath      string `json:"uaPath"`
	DestPath    string `json:"destPath"`
	QbitHost    string `json:"qbitHost"`
	QbitUser    string `json:"qbitUser"`
	QbitPass    string `json:"qbitPass"`
	AutoMove    bool   `json:"autoMove"`
	PrimatePath string `json:"primatePath"`
}

type PrimateRequest struct {
	Path        string `json:"path"`
	Titulo      string `json:"titulo"`
	Descricao   string `json:"descricao"`
	Modo        string `json:"modo"`   // "curso", "ebook", "video"
	TypeId      string `json:"typeId"`
	Multi       bool   `json:"multi"`
	Detalhes    bool   `json:"detalhes"`
	DefaultSig  bool   `json:"defaultSig"`
	PosterPath  string `json:"posterPath"`
	BannerPath  string `json:"bannerPath"`
}

func (a *App) InitDB() error {
	db, err := sql.Open("sqlite", "tracker_stats.db")
	if err != nil {
		return err
	}
	a.db = db

	createTableSQL := `CREATE TABLE IF NOT EXISTS uploads (
		"id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
		"nome" TEXT,
		"tracker" TEXT,
		"tamanho" INTEGER,
		"data" DATETIME DEFAULT CURRENT_TIMESTAMP,
		"status" TEXT
	);`

	_, err = db.Exec(createTableSQL)
	return err
}

func (a *App) GetSettings() AppSettings {
	var s AppSettings
	b, err := os.ReadFile("gui_settings.json")
	if err != nil {
		// Se não existe, tenta copiar do template
		if tmpl, tmplErr := os.ReadFile("gui_settings.example.json"); tmplErr == nil {
			os.WriteFile("gui_settings.json", tmpl, 0644)
			json.Unmarshal(tmpl, &s)
		}
		return s
	}
	json.Unmarshal(b, &s)
	return s
}

func (a *App) SaveSettings(s AppSettings) error {
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile("gui_settings.json", b, 0644)
}

// UpdateEngine triggers git pull inside the Upload-Assistant dir
func (a *App) UpdateEngine() string {
	settings := a.GetSettings()
	uaPath := settings.UAPath

	gitDir := filepath.Join(uaPath, ".git")
	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		return "ERRO: O sistema '.git' não foi encontrado nesta pasta.\n\n" +
			"Para usar a atualização automática, você deve ter baixado o script via comando 'git clone'.\n" +
			"Siga o passo a passo abaixo para resolver:\n\n" +
			"1. Abra o Terminal (PowerShell ou CMD)\n" +
			"2. Digite: cd \"C:\\Caminho\\Onde\\Voce\\Quer\\O\\Script\"\n" +
			"3. Digite: git clone https://github.com/Audionut/Upload-Assistant.git\n" +
			"4. Após baixar, volte aqui nas configurações e selecione a nova pasta criada.\n\n" +
			"Dica: O Git deve estar instalado no seu Windows para que os comandos funcionem."
	}

	runGit := func(args ...string) (string, error) {
		cmd := exec.Command("git", args...)
		cmd.Dir = uaPath
		out, err := cmd.CombinedOutput()
		return string(out), err
	}

	runGit("stash")
	out, err := runGit("pull")
	runGit("stash", "pop")

	if err != nil {
		return fmt.Sprintf("FALHA AO ATUALIZAR:\n%s\n%s", err.Error(), out)
	}
	return out
}

func (a *App) UpdatePrimate() string {
	settings := a.GetSettings()
	primatePath := settings.PrimatePath

	if primatePath == "" {
		return "ERRO: Caminho do PR1MATE PDF não configurado.\n\nVá em Configurações e selecione a pasta onde o pr1matepdf.py está instalado."
	}

	gitDir := filepath.Join(primatePath, ".git")
	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		return "ERRO: O sistema '.git' não foi encontrado nesta pasta.\n\n" +
			"Para usar a atualização automática, você deve ter baixado o script via comando 'git clone'.\n" +
			"Siga o passo a passo abaixo para resolver:\n\n" +
			"1. Abra o Terminal (PowerShell ou CMD)\n" +
			"2. Digite: cd \"C:\\Caminho\\Onde\\Voce\\Quer\\O\\Script\"\n" +
			"3. Digite: git clone https://gitlab.com/n1njapr1mate/pr1mate-pdf.git\n" +
			"4. Após baixar, volte aqui nas configurações e selecione a nova pasta criada.\n\n" +
			"Dica: O Git deve estar instalado no seu Windows para que os comandos funcionem."
	}

	runGit := func(args ...string) (string, error) {
		cmd := exec.Command("git", args...)
		cmd.Dir = primatePath
		out, err := cmd.CombinedOutput()
		return string(out), err
	}

	runGit("stash")
	out, err := runGit("pull")
	runGit("stash", "pop")

	if err != nil {
		return fmt.Sprintf("FALHA AO ATUALIZAR:\n%s\n%s", err.Error(), out)
	}
	return out
}

type TMDBResult struct {
	Tmdb   string `json:"tmdb"`
	Imdb   string `json:"imdb"`
	Tvdb   string `json:"tvdb"`
	Poster string `json:"poster"`
	Type   string `json:"type"`
}

type ScreenshotResult struct {
	Path   string `json:"path"`
	Base64 string `json:"base64"`
	Index  int    `json:"index"`
}

func (a *App) FetchTMDBIDs(targetPath string, isMovie bool) TMDBResult {
	res := TMDBResult{}
	base := filepath.Base(targetPath)
	title := ""
	year := ""

	reYear := regexp.MustCompile(`(?i)(.*?)(?:[\.\s])([12][0-9]{3})(?:[\.\s])`)
	reSeason := regexp.MustCompile(`(?i)(.*?)(?:[\.\s])(?:S\d+|E\d+)(?:[\.\s])`)

	if match := reYear.FindStringSubmatch(base); len(match) > 2 {
		title = strings.ReplaceAll(match[1], ".", " ")
		year = match[2]
	} else if match := reSeason.FindStringSubmatch(base); len(match) > 1 {
		title = strings.ReplaceAll(match[1], ".", " ")
		isMovie = false // Força busca por Série se detectar S01/E01
	} else {
		parts := strings.Split(base, ".")
		if len(parts) > 0 {
			title = parts[0]
		} else {
			title = base
		}
	}
	title = strings.TrimSpace(title)
	if title == "" {
		return res
	}

	settings := a.GetSettings()
	configPyPath := filepath.Join(settings.UAPath, "data", "config.py")

	b, err := os.ReadFile(configPyPath)
	tmdbKey := ""
	if err == nil {
		reKey := regexp.MustCompile(`"tmdb_api"\s*:\s*"([^"]+)"`)
		if m := reKey.FindStringSubmatch(string(b)); len(m) > 1 {
			tmdbKey = m[1]
		}
	}

	if tmdbKey == "" {
		return res
	}

	q := url.QueryEscape(title)
	yParams := ""
	if year != "" {
		if isMovie {
			yParams = "&primary_release_year=" + year
		} else {
			yParams = "&first_air_date_year=" + year
		}
	}

	endpoint := "search/tv"
	if isMovie {
		endpoint = "search/movie"
	}

	searchUrl := fmt.Sprintf("https://api.themoviedb.org/3/%s?api_key=%s&query=%s%s", endpoint, tmdbKey, q, yParams)

	resp, err := http.Get(searchUrl)
	if err != nil {
		return res
	}
	defer resp.Body.Close()

	var searchRes struct {
		Results []struct {
			ID         int    `json:"id"`
			PosterPath string `json:"poster_path"`
		} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&searchRes); err == nil && len(searchRes.Results) > 0 {
		tmdbID := searchRes.Results[0].ID
		res.Tmdb = fmt.Sprintf("%d", tmdbID)
		if searchRes.Results[0].PosterPath != "" {
			res.Poster = "https://image.tmdb.org/t/p/w300" + searchRes.Results[0].PosterPath
		}

		extUrl := ""
		if isMovie {
			extUrl = fmt.Sprintf("https://api.themoviedb.org/3/movie/%d/external_ids?api_key=%s", tmdbID, tmdbKey)
		} else {
			extUrl = fmt.Sprintf("https://api.themoviedb.org/3/tv/%d/external_ids?api_key=%s", tmdbID, tmdbKey)
		}

		resp2, err2 := http.Get(extUrl)
		if err2 == nil {
			defer resp2.Body.Close()
			var ext struct {
				ImdbId string `json:"imdb_id"`
				TvdbId int    `json:"tvdb_id"`
			}
			json.NewDecoder(resp2.Body).Decode(&ext)
			if ext.ImdbId != "" {
				res.Imdb = strings.TrimPrefix(ext.ImdbId, "tt")
			}
			if ext.TvdbId > 0 {
				res.Tvdb = fmt.Sprintf("%d", ext.TvdbId)
			}
		}
	}

	if isMovie {
		res.Type = "MOVIE"
	} else {
		res.Type = "TV"
	}
	return res
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := &App{}
	app.InitDB() // Initialize DB silently on startup
	return app
}

// RecordUpload adds an entry to the upload stats database
func (a *App) RecordUpload(nome string, tracker string, tamanho int64, status string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	insertSQL := `INSERT INTO uploads(nome, tracker, tamanho, status) VALUES (?, ?, ?, ?)`
	_, err := a.db.Exec(insertSQL, nome, tracker, tamanho, status)
	return err
}

type UploadStat struct {
	TotalUploads int    `json:"totalUploads"`
	TotalSizeGB  string `json:"totalSizeGB"`
	SuccessRate  string `json:"successRate"`
}

type TrackerStat struct {
	Tracker string `json:"tracker"`
	Count   int    `json:"count"`
}

type DashboardData struct {
	Stats    UploadStat    `json:"stats"`
	Trackers []TrackerStat `json:"trackers"`
}

type UploadEntry struct {
	ID      int    `json:"id"`
	Nome    string `json:"nome"`
	Tracker string `json:"tracker"`
	Tamanho int64  `json:"tamanho"`
	Data    string `json:"data"`
	Status  string `json:"status"`
}

func (a *App) GetDashboardData() DashboardData {
	data := DashboardData{}
	if a.db == nil {
		return data
	}

	// Total Uploads
	a.db.QueryRow("SELECT COUNT(*) FROM uploads").Scan(&data.Stats.TotalUploads)

	// Total Size
	var totalBytes int64
	a.db.QueryRow("SELECT COALESCE(SUM(tamanho), 0) FROM uploads WHERE status='Sucesso'").Scan(&totalBytes)
	data.Stats.TotalSizeGB = fmt.Sprintf("%.2f GB", float64(totalBytes)/(1024*1024*1024))

	// Success Rate
	var successCount int
	a.db.QueryRow("SELECT COUNT(*) FROM uploads WHERE status='Sucesso'").Scan(&successCount)
	if data.Stats.TotalUploads > 0 {
		rate := (float64(successCount) / float64(data.Stats.TotalUploads)) * 100
		data.Stats.TotalSizeGB = fmt.Sprintf("%.2f GB", float64(totalBytes)/(1024*1024*1024)) // keep it
		data.Stats.SuccessRate = fmt.Sprintf("%.1f%%", rate)
	} else {
		data.Stats.SuccessRate = "0%"
	}

	// Tracker Breakdown
	rows, err := a.db.Query("SELECT tracker, COUNT(*) as count FROM uploads GROUP BY tracker")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t TrackerStat
			rows.Scan(&t.Tracker, &t.Count)
			data.Trackers = append(data.Trackers, t)
		}
	}

	return data
}

func (a *App) GetRecentUploads(limit int) []UploadEntry {
	var entries []UploadEntry
	if a.db == nil {
		return entries
	}

	rows, err := a.db.Query("SELECT id, nome, tracker, tamanho, data, status FROM uploads ORDER BY id DESC LIMIT ?", limit)
	if err != nil {
		return entries
	}
	defer rows.Close()

	for rows.Next() {
		var e UploadEntry
		rows.Scan(&e.ID, &e.Nome, &e.Tracker, &e.Tamanho, &e.Data, &e.Status)
		entries = append(entries, e)
	}
	return entries
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SelectFile opens a dialog to select a video file
func (a *App) SelectFile() string {
	path, _ := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Selecionar Vídeo",
		Filters: []runtime.FileFilter{
			{DisplayName: "Videos", Pattern: "*.mkv;*.mp4;*.ts;*.avi"},
		},
	})
	return path
}

// SelectFolder opens a dialog to select a folder
func (a *App) SelectFolder() string {
	path, _ := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Selecionar Pasta",
	})
	return path
}

type UploadRequest struct {
	Path        string `json:"path"`
	Tracker     string `json:"tracker"`
	Category    string `json:"category"`
	Screens     int    `json:"screens"`
	ImageHost   string `json:"imageHost"`
	Tmdb        string `json:"tmdb"`
	Imdb        string `json:"imdb"`
	Mal         string `json:"mal"`
	Tvdb        string `json:"tvdb"`
	Res         string `json:"res"`
	Type        string `json:"type"`
	Debug       bool   `json:"debug"`
	Internal    bool   `json:"internal"`
	Personal    bool   `json:"personal"`
	KeepImg     bool   `json:"keepImg"`
	NoSeed      bool   `json:"noSeed"`
	SkipDupe    bool   `json:"skipDupe"`
	Cleanup     bool   `json:"cleanup"`
	ForceScreens bool  `json:"forceScreens"`
	Ffdebug      bool  `json:"ffdebug"`
	AutoY        bool  `json:"autoY"`
	AutoMove     bool  `json:"autoMove"`
	DestPath     string `json:"destPath"`
}

// StartUpload inits the Upload Assistant python script
func (a *App) StartUpload(req UploadRequest) error {
	a.uploadMutex.Lock()
	if a.isUploading {
		a.uploadMutex.Unlock()
		return fmt.Errorf("já existe um upload em andamento")
	}
	a.isUploading = true
	a.uploadMutex.Unlock()

	// Calc size
	var totalSize int64
	info, err := os.Stat(req.Path)
	if err == nil {
		if info.IsDir() {
			filepath.Walk(req.Path, func(path string, info os.FileInfo, err error) error {
				if !info.IsDir() {
					totalSize += info.Size()
				}
				return nil
			})
		} else {
			totalSize = info.Size()
		}
	}

	uploadStatus := "Pendente"

	defer func() {
		a.uploadMutex.Lock()
		a.isUploading = false
		a.uploadMutex.Unlock()
		a.RecordUpload(filepath.Base(req.Path), req.Tracker, totalSize, uploadStatus)
		runtime.EventsEmit(a.ctx, "uploadFinished")
	}()

	if req.ForceScreens {
		target := req.Path
		info, err := os.Stat(req.Path)
		if err == nil && !info.IsDir() {
			target = filepath.Dir(req.Path)
		}
		ssDir := filepath.Join(target, "Screenshots")
		if _, err := os.Stat(ssDir); err == nil {
			os.RemoveAll(ssDir)
			runtime.EventsEmit(a.ctx, "log", fmt.Sprintf("<span style='color:#e5a00d;'>Screenshots removidas: %s</span>\n", ssDir))
		}
	}

	settings := a.GetSettings()
	uaPath := settings.UAPath
	script := filepath.Join(uaPath, "upload.py")
	args := []string{"-u", script, req.Path}

	if req.Tracker != "" { args = append(args, "--trackers", req.Tracker) }
	if req.Category != "" { args = append(args, "--category", strings.ToLower(req.Category)) }
	args = append(args, "--screens", fmt.Sprintf("%d", req.Screens))
	if req.ImageHost != "" { args = append(args, "--image-host", req.ImageHost) }

	if req.Tmdb != "" { args = append(args, "--tmdb", req.Tmdb) }
	if req.Imdb != "" { args = append(args, "--imdb", req.Imdb) }
	if req.Mal != "" { args = append(args, "--mal", req.Mal) }
	if req.Tvdb != "" { args = append(args, "--tvdb", req.Tvdb) }

	if req.Res != "AUTO" && req.Res != "" { args = append(args, "--res", req.Res) }
	if req.Type != "AUTO" && req.Type != "" { args = append(args, "--type", strings.ToLower(req.Type)) }

	if req.Debug { args = append(args, "--debug") }
	if req.Internal { args = append(args, "--internal") }
	if req.Personal { args = append(args, "--personalrelease") }
	if req.KeepImg { args = append(args, "--keep-images") }
	if req.NoSeed { args = append(args, "--noseed") }
	if req.SkipDupe {
		args = append(args, "--skip-dupe-check", "--force-trackers")
	}
	if req.Cleanup { args = append(args, "--cleanup") }
	if req.Ffdebug { args = append(args, "--ffdebug") }

	a.uploadCmd = exec.Command("python", args...)
	a.uploadCmd.Dir = uaPath

	stdout, err := a.uploadCmd.StdoutPipe()
	if err != nil { 
		uploadStatus = "Falha"
		return err 
	}
	a.uploadCmd.Stderr = a.uploadCmd.Stdout

	stdin, err := a.uploadCmd.StdinPipe()
	if err != nil { 
		uploadStatus = "Falha"
		return err 
	}
	a.uploadStdin = stdin

	runtime.EventsEmit(a.ctx, "log", fmt.Sprintf("<span style='color:#555;'>python %s</span>\n\n", strings.Join(args, " ")))

	err = a.uploadCmd.Start()
	if err != nil { 
		uploadStatus = "Falha"
		return err 
	}

	go a.monitorOutput(stdout, req.AutoY)

	err = a.uploadCmd.Wait()
	a.uploadCmd = nil
	if err != nil {
		uploadStatus = "Falha"
	} else {
		uploadStatus = "Sucesso"
		// Automação Pós-Upload
		if req.AutoMove && req.DestPath != "" {
			runtime.EventsEmit(a.ctx, "log", fmt.Sprintf("\n<b style='color:#3498db;'>[Automação] Movendo arquivos para: %s</b>\n", req.DestPath))
			moveErr := a.PostUploadMove(filepath.Base(req.Path), req.DestPath)
			if moveErr != nil {
				runtime.EventsEmit(a.ctx, "log", fmt.Sprintf("<b style='color:#e74c3c;'>[Erro Automação] %s</b>\n", moveErr.Error()))
			} else {
				runtime.EventsEmit(a.ctx, "log", "<b style='color:#2ecc71;'>[Sucesso] qBittorrent notificado e arquivos movidos.</b>\n")
			}
		}
	}
	return err
}

func (a *App) monitorOutput(stdout io.Reader, autoY bool) {
	buffer := make([]byte, 1024)
	var outputHistory string

	for {
		n, err := stdout.Read(buffer)
		if n > 0 {
			chunk := string(buffer[:n])
			runtime.EventsEmit(a.ctx, "log", chunk)

			outputHistory += chunk
			if len(outputHistory) > 2000 {
				outputHistory = outputHistory[len(outputHistory)-1000:]
			}

			if autoY {
				lowerBuf := strings.ToLower(outputHistory)
				reply := ""
				
				yPrompts := []string{"is this correct?", "enter 'y' to upload", "correct? (y/n)", "press enter to skip uploading", "are you sure?"}
				cPrompts := []string{"continue with incomplete pack", "(a/c/q):"}
				aPrompts := []string{"show (a)ll remaining"}

				for _, p := range yPrompts {
					if strings.Contains(lowerBuf, p) { reply = "y" }
				}
				for _, p := range cPrompts {
					if strings.Contains(lowerBuf, p) { reply = "c" }
				}
				for _, p := range aPrompts {
					if strings.Contains(lowerBuf, p) { reply = "a" }
				}

				if reply != "" {
					outputHistory = ""
					go func(r string) {
						time.Sleep(1 * time.Second)
						a.ManualTerminalInput(r)
						runtime.EventsEmit(a.ctx, "log", fmt.Sprintf("\n<b style='color:#27ae60;'>>>> Auto-respondendo '%s' para prosseguir...</b>\n", r))
					}(reply)
				}
			}
		}
		if err != nil {
			break
		}
	}
}

func (a *App) StopUpload() {
	if a.uploadCmd != nil && a.uploadCmd.Process != nil {
		a.uploadCmd.Process.Kill()
		runtime.EventsEmit(a.ctx, "log", "\n<b style='color:#e74c3c;'>Interrompendo processo...</b>\n")
	}
}

func (a *App) StartPrimateUpload(req PrimateRequest) error {
	a.primateMutex.Lock()
	if a.isUploading2 {
		a.primateMutex.Unlock()
		return fmt.Errorf("já existe um upload em andamento")
	}
	a.isUploading2 = true
	a.primateMutex.Unlock()

	defer func() {
		a.primateMutex.Lock()
		a.isUploading2 = false
		a.primateMutex.Unlock()
		runtime.EventsEmit(a.ctx, "primateFinished")
	}()

	settings := a.GetSettings()
	script := filepath.Join(settings.PrimatePath, "pr1matepdf.py")

	// Escrever descricao.txt na pasta alvo se houver descrição
	descFile := ""
	if req.Descricao != "" {
		dir := req.Path
		info, err := os.Stat(req.Path)
		if err == nil && !info.IsDir() {
			dir = filepath.Dir(req.Path)
		}
		descFile = filepath.Join(dir, "descricao.txt")
		os.WriteFile(descFile, []byte(req.Descricao), 0644)
	}

	args := []string{"-u", script, req.Path}

	if req.Titulo != "" {
		args = append(args, "-titulo", req.Titulo)
	}
	if req.Modo != "" {
		args = append(args, "-"+req.Modo)
	}
	if req.TypeId != "" {
		args = append(args, "-type", req.TypeId)
	}
	if req.Multi {
		args = append(args, "-multi")
	}
	if req.Detalhes {
		args = append(args, "-detalhes")
	}
	if req.DefaultSig {
		args = append(args, "-default")
	}
	if req.PosterPath != "" {
		args = append(args, "-poster", req.PosterPath)
	}
	if req.BannerPath != "" {
		args = append(args, "-banner", req.BannerPath)
	}

	cmd := exec.Command("python", args...)
	cmd.Dir = settings.PrimatePath

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("erro ao iniciar pr1matepdf.py: %v", err)
	}
	a.primateCmd = cmd

	go a.monitorOutput(stdout, false)

	cmd.Wait()

	// Limpar descricao.txt temporário
	if descFile != "" {
		os.Remove(descFile)
	}

	return nil
}

func (a *App) StopPrimateUpload() {
	if a.primateCmd != nil && a.primateCmd.Process != nil {
		a.primateCmd.Process.Kill()
		runtime.EventsEmit(a.ctx, "primateLog", "\n<b style='color:#e74c3c;'>Interrompendo processo...</b>\n")
	}
}

func (a *App) ManualTerminalInput(input string) {
	if a.uploadStdin != nil {
		a.uploadStdin.Write([]byte(input + "\n"))
	}
}

type HealthCheckResult struct {
	Python string `json:"python"`
	FFmpeg string `json:"ffmpeg"`
	Git    string `json:"git"`
}

func (a *App) CheckRequirements() HealthCheckResult {
	res := HealthCheckResult{}
	
	if err := exec.Command("python", "--version").Run(); err == nil {
		res.Python = "OK"
	} else {
		res.Python = "ERRO"
	}

	if err := exec.Command("ffmpeg", "-version").Run(); err == nil {
		res.FFmpeg = "OK"
	} else {
		res.FFmpeg = "ERRO"
	}

	if err := exec.Command("git", "--version").Run(); err == nil {
		res.Git = "OK"
	} else {
		res.Git = "ERRO"
	}
	
	return res
}

func (a *App) GetPythonConfig() string {
	settings := a.GetSettings()
	configPath := filepath.Join(settings.UAPath, "data", "config.py")
	b, err := os.ReadFile(configPath)
	if err != nil {
		return ""
	}
	return string(b)
}

func (a *App) SavePythonConfig(content string) error {
	settings := a.GetSettings()
	configPath := filepath.Join(settings.UAPath, "data", "config.py")
	
	// Create backup
	if _, err := os.Stat(configPath); err == nil {
		backupPath := configPath + ".bak"
		b, _ := os.ReadFile(configPath)
		os.WriteFile(backupPath, b, 0644)
	}

	return os.WriteFile(configPath, []byte(content), 0644)
}

// GetFileInfo returns the directory and base name of a selected file
func (a *App) GetFileInfo(path string) map[string]string {
	return map[string]string{
		"dir":  filepath.Dir(path),
		"name": filepath.Base(path),
		"ext":  filepath.Ext(path),
	}
}

// RenameFile renames a file or folder on disk and batch renames episodes if it's a TV Show Folder
func (a *App) RenameFile(oldPath string, newName string) error {
	dir := filepath.Dir(oldPath)
	ext := filepath.Ext(oldPath)
	
	info, err := os.Stat(oldPath)
	if err != nil {
		return err
	}

	if !info.IsDir() {
		newPath := filepath.Join(dir, newName+ext)
		return os.Rename(oldPath, newPath)
	}

	// Tratar diretórios e propagar o padrão para os arquivos de vídeo internos
	newDirPath := filepath.Join(dir, newName)
	if oldPath != newDirPath {
		err = os.Rename(oldPath, newDirPath)
		if err != nil {
			return err
		}
	}

	// Se for uma pasta de Série Completa (S01, S02... seguido de ponto), vamos padronizar os episódios dentro
	// Ex reGroup: Scorpion.S01 . 1080p.PMTP.WEB...
	reSeason := regexp.MustCompile(`(?i)(.*?\.S\d{2,3})\.(.*)`)
	matches := reSeason.FindStringSubmatch(newName)
	if len(matches) == 3 {
		prefix := matches[1] // Scorpion.S01
		suffix := matches[2] // 1080p.PMTP.WEB-DL...

		filepath.Walk(newDirPath, func(p string, i os.FileInfo, e error) error {
			if e == nil && !i.IsDir() {
				extV := strings.ToLower(filepath.Ext(p))
				if extV == ".mkv" || extV == ".mp4" || extV == ".ts" || extV == ".avi" {
					baseName := filepath.Base(p)
					// Capturar o número do episódio (ex: E01, e02, E123)
					reEp := regexp.MustCompile(`(?i)E(\d{2,3})`)
					epMatch := reEp.FindStringSubmatch(baseName)
					if len(epMatch) == 2 {
						epStr := "E" + epMatch[1] // E01
						
						// Novo nome limpo e padronizado! Ex: Scorpion.S01E01.1080p.PMTP...
						newFileBase := prefix + epStr + "." + suffix + extV
						newFilePath := filepath.Join(filepath.Dir(p), newFileBase)
						
						if p != newFilePath {
							os.Rename(p, newFilePath)
							runtime.EventsEmit(a.ctx, "log", fmt.Sprintf("Renomeado: %s -> %s", filepath.Base(p), newFileBase))
						}
					}
				}
			}
			return nil
		})
	}

	return nil
}

// PreviewEpisodes mock-renames the episodes to show the user what will happen to internal files
func (a *App) PreviewEpisodes(oldPath string, newFolderName string) []string {
	var previews []string
	info, err := os.Stat(oldPath)
	if err != nil || !info.IsDir() {
		return previews
	}

	reSeason := regexp.MustCompile(`(?i)(.*?\.S\d{2,3})\.(.*)`)
	matches := reSeason.FindStringSubmatch(newFolderName)
	if len(matches) == 3 {
		prefix := matches[1]
		suffix := matches[2]

		entries, err := os.ReadDir(oldPath)
		if err == nil {
			for _, entry := range entries {
				if !entry.IsDir() {
					p := entry.Name()
					extV := strings.ToLower(filepath.Ext(p))
					if extV == ".mkv" || extV == ".mp4" || extV == ".ts" || extV == ".avi" {
						reEp := regexp.MustCompile(`(?i)E(\d{2,3})`)
						epMatch := reEp.FindStringSubmatch(p)
						if len(epMatch) == 2 {
							epStr := "E" + epMatch[1]
							newFileBase := prefix + epStr + "." + suffix + extV
							previews = append(previews, fmt.Sprintf("%s ➔ %s", p, newFileBase))
						}
					}
				}
			}
		}
	}
	return previews
}

// ParseMediaInfo tries to extract metadata from a file or the largest file in a dir using ffprobe
func (a *App) ParseMediaInfo(path string) map[string]string {
	res := map[string]string{
		"res": "", "vcodec": "", "acodec": "", "channels": "", "source": "", "hdr": "",
		"streaming": "", "group": "", "audio": "", "s": "", "e": "", "nome": "", "suggested_cat": "",
	}
	
	targetPath := path
	info, err := os.Stat(path)
	
	var allNames []string

	if err == nil && info.IsDir() {
		var biggest string
		var maxSz int64
		filepath.Walk(path, func(p string, i os.FileInfo, e error) error {
			if e == nil && !i.IsDir() {
				ext := strings.ToLower(filepath.Ext(p))
				if ext == ".mkv" || ext == ".mp4" || ext == ".ts" || ext == ".avi" {
					allNames = append(allNames, filepath.Base(p))
					if i.Size() > maxSz {
						maxSz = i.Size()
						biggest = p
					}
				}
			}
			return nil
		})
		if biggest != "" {
			targetPath = biggest
		}
	} else {
		allNames = append(allNames, filepath.Base(path))
	}

	// Extração inteligente baseada nos nomes dos arquivos (procurando tags em qualquer arquivo)
	streamings := []string{"AMZN", "NF", "DSNP", "HMAX", "MAX", "ATVP", "PMTP", "PCOK", "HULU", "STAN", "CRAV"}
	
	for _, name := range allNames {
		up := strings.ToUpper(name)
		
		if res["res"] == "" {
			if strings.Contains(up, "2160P") || strings.Contains(up, "4K") { res["res"] = "2160p" }
			if strings.Contains(up, "1080P") { res["res"] = "1080p" }
			if strings.Contains(up, "720P") { res["res"] = "720p" }
		}
		if res["source"] == "" {
			if strings.Contains(up, "WEB-DL") || strings.Contains(up, "WEBDL") { res["source"] = "WEB-DL" }
			if strings.Contains(up, "BLURAY") || strings.Contains(up, "BLU-RAY") { res["source"] = "BluRay" }
			if strings.Contains(up, "HDTV") { res["source"] = "HDTV" }
			if strings.Contains(up, "REMUX") { res["source"] = "BluRay" } 
		}
		if res["hdr"] == "" {
			if strings.Contains(up, "DV") || strings.Contains(up, "DOLBY VISION") { res["hdr"] = "DV" }
			if strings.Contains(up, "HDR") { res["hdr"] = "HDR" }
		}
		if res["streaming"] == "" {
			for _, s := range streamings {
				if strings.Contains(up, s) { res["streaming"] = s; break }
			}
		}
		if res["audio"] == "" {
			if strings.Contains(up, "DUAL") || strings.Contains(up, "MULTI") {
				if strings.Contains(up, "DUAL") { res["audio"] = "DUAL" } else { res["audio"] = "MULTI" }
			}
		}
		
		// Extracao de Grupo
		if res["group"] == "" || res["group"] == "CBR" {
			lastDash := strings.LastIndex(name, "-")
			if lastDash > 0 {
				remainder := name[lastDash+1:]
				extIdx := strings.LastIndex(remainder, ".")
				if extIdx > 0 { remainder = remainder[:extIdx] } // remove extensão
				parts := strings.Split(remainder, ".")
				potentialGroup := parts[len(parts)-1]
				if strings.ToUpper(potentialGroup) != "DUAL" && strings.ToUpper(potentialGroup) != "MULTI" {
					res["group"] = potentialGroup
				}
			}
		}

		// Verificação de Grupos Banidos
		bannedGroups := []string{
			"4K4U", "afm72", "Alcaide_Kira", "AROMA", "ASM", "Bandi", "BiTOR", "BLUDV",
			"Bluespots", "BOLS", "CaNNIBal", "Comando", "d3g", "DepraveD", "Emmid", "EMBER",
			"FGT", "FreetheFish", "Garshasp", "Ghost", "Grym", "HDS", "Hi10", "HiQVE",
			"Hiro360", "ImE", "ION10", "iVy", "Judas", "LAMA", "Langbard", "LION", "Lapumia",
			"MeGusta", "MONOLITH", "MRCS", "NaNi", "Natty", "nikt0", "OEPlus", "OFT", "OsC",
			"Panda", "PANDEMONiUM", "PHOCiS", "PiRaTeS", "PYC", "QxR", "r00t", "Ralphy",
			"RARBG", "RetroPeeps", "RZeroX", "S74Ll10n", "SAMPA", "Sicario", "SiCFoI",
			"Silence", "SkipTT", "SM737", "SPDVD", "STUTTERSHIT", "SWTYBLZ", "t3nzin", "TAoE",
			"TEKNO3D", "Telly", "TGx", "Tigole", "TSP", "TSPxL", "TWA", "UnKn0wn", "VXT",
			"Vyndros", "W32", "Will1869", "x0r", "YIFY", "YTS", "YTS.MX",
		}
		if res["group"] != "" {
			for _, banned := range bannedGroups {
				if strings.EqualFold(res["group"], banned) {
					res["banned_group"] = res["group"]
					break
				}
			}
		}

		// Sugestão de Categoria Automática via RegEx
		if res["suggested_cat"] == "" {
			reSeason := regexp.MustCompile(`(?i)(?:S\d+|E\d+|1x\d{2})`)
			if reSeason.MatchString(name) {
				res["suggested_cat"] = "TV"
			} else {
				animeGroups := []string{"[SUBSPLEASE]", "[ERAI-RAWS]", "[ASW]", "[JUDAS]", "[CLEO]", "[HORRIBLESUBS]"}
				for _, ag := range animeGroups {
					if strings.Contains(up, ag) {
						res["suggested_cat"] = "ANIME"
						break
					}
				}
			}
		}
	}

	if res["suggested_cat"] == "" {
		res["suggested_cat"] = "MOVIE" // Default se não achar S01 ou Anime tags
	}

	// Now try ffprobe no arquivo principal
	cmd := exec.Command("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=height,codec_name", "-of", "csv=p=0", targetPath)
	out, err := cmd.Output()
	if err == nil {
		lines := strings.Split(strings.TrimSpace(string(out)), ",")
		if len(lines) == 2 {
			codec := lines[0]
			height := lines[1]
			
			if height == "2160" { res["res"] = "2160p" } else if height == "1080" { res["res"] = "1080p" } else if height == "720" { res["res"] = "720p" }
			if codec == "hevc" { res["vcodec"] = "HEVC" } else if codec == "h264" { res["vcodec"] = "H.264" }
		}
	}

	// audio stream probe
	cmdA := exec.Command("ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name,channels", "-of", "csv=p=0", targetPath)
	outA, err := cmdA.Output()
	if err == nil {
		lines := strings.Split(strings.TrimSpace(string(outA)), ",")
		if len(lines) == 2 {
			codec := lines[0]
			ch := lines[1]
			
			if strings.Contains(codec, "ac3") || codec == "eac3" { res["acodec"] = "DDP" }
			if strings.Contains(codec, "dts") { res["acodec"] = "DTS-HD MA" }
			if strings.Contains(codec, "truehd") { res["acodec"] = "TrueHD" }
			if strings.Contains(codec, "aac") { res["acodec"] = "AAC" }
			
			if ch == "6" { res["channels"] = "5.1" } else if ch == "8" { res["channels"] = "7.1" } else if ch == "2" { res["channels"] = "2.0" }
			
			// If we got DDP and 6 channels -> DDP5.1
			if (res["acodec"] == "DDP" || res["acodec"] == "DD" || res["acodec"] == "AAC") && res["channels"] != "" {
				res["acodec"] = res["acodec"] + res["channels"]
				res["channels"] = "" // merge
			}
		}
	}

	// Contagem real de idiomas distintos para DUAL vs MULTI via FFprobe
	cmdLang := exec.Command("ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream_tags=language", "-of", "csv=p=0", targetPath)
	outLang, errLang := cmdLang.Output()
	if errLang == nil {
		langLines := strings.Split(strings.TrimSpace(string(outLang)), "\n")
		langSet := make(map[string]bool)
		for _, l := range langLines {
			l = strings.TrimSpace(l)
			if l != "" {
				langSet[strings.ToLower(l)] = true
			}
		}
		distinctLangs := len(langSet)
		if distinctLangs >= 3 {
			res["audio"] = "MULTI"
		} else if distinctLangs == 2 {
			res["audio"] = "DUAL"
		}
		// se distinctLangs <= 1, não altera (pode ser single audio)
	}
	
	return res
}

// ValidateMedia acts as a safe-check guard ensuring the metadata on filename correctly matches media tracks
func (a *App) ValidateMedia(targetPath string) []string {
	var warnings []string
	info, err := os.Stat(targetPath)
	actualTargetPath := targetPath

	if err == nil && info.IsDir() {
		var biggest string
		var maxSz int64
		filepath.Walk(targetPath, func(p string, i os.FileInfo, e error) error {
			if e == nil && !i.IsDir() {
				ext := strings.ToLower(filepath.Ext(p))
				if ext == ".mkv" || ext == ".mp4" || ext == ".ts" || ext == ".avi" {
					if i.Size() > maxSz {
						maxSz = i.Size()
						biggest = p
					}
				}
			}
			return nil
		})
		if biggest != "" {
			actualTargetPath = biggest
		}
	}

	cmdA := exec.Command("ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream_tags=language", "-of", "csv=p=0", actualTargetPath)
	outA, errA := cmdA.Output()

	if errA == nil {
		langLines := strings.Split(strings.TrimSpace(string(outA)), "\n")
		langSet := make(map[string]bool)
		for _, l := range langLines {
			l = strings.TrimSpace(l)
			if l != "" {
				langSet[strings.ToLower(l)] = true
			}
		}
		distinctLangs := len(langSet)
		upPath := strings.ToUpper(filepath.Base(targetPath))

		if distinctLangs >= 3 && strings.Contains(upPath, "DUAL") && !strings.Contains(upPath, "MULTI") {
			warnings = append(warnings, fmt.Sprintf("ATENÇÃO CRÍTICA: O nome diz DUAL mas o FFprobe detectou %d idiomas de áudio distintos! Use MULTI no lugar de DUAL para evitar problemas com os admins do tracker!", distinctLangs))
		} else if distinctLangs == 2 && strings.Contains(upPath, "MULTI") {
			warnings = append(warnings, "O nome diz MULTI mas o FFprobe detectou apenas 2 idiomas. Use DUAL.")
		} else if distinctLangs >= 2 && !strings.Contains(upPath, "DUAL") && !strings.Contains(upPath, "MULTI") {
			if distinctLangs >= 3 {
				warnings = append(warnings, fmt.Sprintf("FFprobe detectou %d idiomas de áudio distintos, mas não há a TAG 'MULTI' no nome original da pasta!", distinctLangs))
			} else {
				warnings = append(warnings, fmt.Sprintf("FFprobe detectou %d idiomas de áudio distintos, mas não há a TAG 'DUAL' no nome original da pasta!", distinctLangs))
			}
		} else if distinctLangs == 0 {
			warnings = append(warnings, "O FFprobe não conseguiu identificar nenhuma faixa de Áudio no arquivo. Arquivo corrompido ou mudo?")
		}
	}

	return warnings
}

func (a *App) BackupData() (string, error) {
	backupDir := "backups"
	if _, err := os.Stat(backupDir); os.IsNotExist(err) {
		os.Mkdir(backupDir, 0755)
	}

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	destFolder := filepath.Join(backupDir, "backup_"+timestamp)
	err := os.Mkdir(destFolder, 0755)
	if err != nil {
		return "", err
	}

	filesToBackup := []string{"gui_settings.json", "tracker_stats.db"}
	for _, f := range filesToBackup {
		if _, err := os.Stat(f); err == nil {
			input, err := os.ReadFile(f)
			if err == nil {
				os.WriteFile(filepath.Join(destFolder, f), input, 0644)
			}
		}
	}

	return destFolder, nil
}

func (a *App) qbitLogin(host, user, pass string) (string, error) {
	if host == "" {
		return "", fmt.Errorf("qBit Host não configurado")
	}

	host = strings.TrimRight(host, "/")
	loginUrl := fmt.Sprintf("%s/api/v2/auth/login", host)
	data := url.Values{}
	data.Set("username", user)
	data.Set("password", pass)

	resp, err := http.PostForm(loginUrl, data)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("falha no login qBit: %d", resp.StatusCode)
	}

	cookie := ""
	for _, c := range resp.Cookies() {
		if c.Name == "SID" {
			cookie = c.Value
			break
		}
	}

	if cookie == "" {
		return "", fmt.Errorf("SID não encontrado na resposta do qBit")
	}
	return cookie, nil
}

func (a *App) PostUploadMove(name string, newPath string) error {
	settings := a.GetSettings()
	if settings.QbitHost == "" {
		return fmt.Errorf("qBit Host não configurado nas configurações")
	}

	host := strings.TrimRight(settings.QbitHost, "/")

	cookie, err := a.qbitLogin(host, settings.QbitUser, settings.QbitPass)
	if err != nil {
		return err
	}

	// 1. Encontrar o torrent pelo nome
	searchUrl := fmt.Sprintf("%s/api/v2/torrents/info?filter=all", host)
	req, _ := http.NewRequest("GET", searchUrl, nil)
	req.AddCookie(&http.Cookie{Name: "SID", Value: cookie})

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var torrents []map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&torrents)
	if err != nil {
		return err
	}

	var hash string
	for _, t := range torrents {
		if tName, ok := t["name"].(string); ok {
			if strings.Contains(strings.ToLower(tName), strings.ToLower(name)) {
				if tHash, ok := t["hash"].(string); ok {
					hash = tHash
					break
				}
			}
		}
	}

	if hash == "" {
		return fmt.Errorf("torrent '%s' não encontrado no qBittorrent", name)
	}

	// 2. SetLocation (qBit move os arquivos)
	moveUrl := fmt.Sprintf("%s/api/v2/torrents/setLocation", host)
	moveData := url.Values{}
	moveData.Set("hashes", hash)
	moveData.Set("location", newPath)

	reqMove, _ := http.NewRequest("POST", moveUrl, strings.NewReader(moveData.Encode()))
	reqMove.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	reqMove.AddCookie(&http.Cookie{Name: "SID", Value: cookie})

	respMove, err := client.Do(reqMove)
	if err != nil {
		return err
	}
	defer respMove.Body.Close()

	if respMove.StatusCode != 200 {
		return fmt.Errorf("falha ao mover torrent no qBit: %d", respMove.StatusCode)
	}

	return nil
}

// GenerateScreenshots captures N screenshots from the video using FFmpeg for preview
func (a *App) GenerateScreenshots(mediaPath string, count int) []ScreenshotResult {
	var results []ScreenshotResult
	if mediaPath == "" || count <= 0 {
		return results
	}

	settings := a.GetSettings()
	uaPath := settings.UAPath

	// Find the target video file
	targetFile := mediaPath
	info, err := os.Stat(mediaPath)
	if err != nil {
		runtime.EventsEmit(a.ctx, "log", fmt.Sprintf("<span style='color:#e74c3c;'>Erro ao acessar: %s</span>\n", err.Error()))
		return results
	}

	if info.IsDir() {
		var biggest string
		var maxSz int64
		filepath.Walk(mediaPath, func(p string, i os.FileInfo, e error) error {
			if e == nil && !i.IsDir() {
				ext := strings.ToLower(filepath.Ext(p))
				if ext == ".mkv" || ext == ".mp4" || ext == ".ts" || ext == ".avi" {
					if i.Size() > maxSz {
						maxSz = i.Size()
						biggest = p
					}
				}
			}
			return nil
		})
		if biggest != "" {
			targetFile = biggest
		}
	}

	runtime.EventsEmit(a.ctx, "screenshotProgress", "Obtendo duração do vídeo...")

	// Get duration via ffprobe
	cmd := exec.Command("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", targetFile)
	out, err := cmd.Output()
	if err != nil {
		runtime.EventsEmit(a.ctx, "log", "<span style='color:#e74c3c;'>Erro ao obter duração via FFprobe</span>\n")
		runtime.EventsEmit(a.ctx, "screenshotProgress", "")
		return results
	}
	durationStr := strings.TrimSpace(string(out))
	duration, err := strconv.ParseFloat(durationStr, 64)
	if err != nil || duration <= 0 {
		runtime.EventsEmit(a.ctx, "log", "<span style='color:#e74c3c;'>Duração do vídeo inválida</span>\n")
		runtime.EventsEmit(a.ctx, "screenshotProgress", "")
		return results
	}

	// Create preview directory
	baseName := filepath.Base(mediaPath)
	tmpDir := filepath.Join(uaPath, "tmp", baseName)
	os.MkdirAll(tmpDir, 0755)

	// Clean existing preview screenshots
	existingPreviews, _ := filepath.Glob(filepath.Join(tmpDir, "PREVIEW-*.png"))
	for _, p := range existingPreviews {
		os.Remove(p)
	}

	// Generate screenshots at evenly-spaced intervals with randomness
	margin := duration * 0.10
	if margin < 5 {
		margin = 5
	}
	if margin > duration*0.15 {
		margin = duration * 0.15
	}
	usable := duration - 2*margin
	if usable <= 0 {
		usable = duration * 0.8
		margin = duration * 0.1
	}

	for i := 0; i < count; i++ {
		progress := fmt.Sprintf("Gerando screenshot %d de %d...", i+1, count)
		runtime.EventsEmit(a.ctx, "screenshotProgress", progress)

		segmentSize := usable / float64(count)
		baseTime := margin + segmentSize*float64(i)
		offset := rand.Float64() * segmentSize * 0.8
		timestamp := baseTime + offset

		screenshotPath := filepath.Join(tmpDir, fmt.Sprintf("PREVIEW-%d.png", i))

		// Run ffmpeg to capture screenshot
		ffCmd := exec.Command("ffmpeg", "-y",
			"-ss", fmt.Sprintf("%.3f", timestamp),
			"-i", targetFile,
			"-vframes", "1",
			"-compression_level", "6",
			"-pred", "mixed",
			screenshotPath,
		)
		ffCmd.Run()

		// Read and encode to base64
		if _, err := os.Stat(screenshotPath); err == nil {
			imgData, err := os.ReadFile(screenshotPath)
			if err == nil {
				b64 := base64.StdEncoding.EncodeToString(imgData)
				results = append(results, ScreenshotResult{
					Path:   screenshotPath,
					Base64: "data:image/png;base64," + b64,
					Index:  i,
				})
			}
		}
	}

	runtime.EventsEmit(a.ctx, "screenshotProgress", "")
	runtime.EventsEmit(a.ctx, "log", fmt.Sprintf("<span style='color:#2ecc71;'>✓ %d screenshots geradas com sucesso para pré-visualização!</span>\n", len(results)))
	return results
}

// DeletePreviewScreenshots removes preview screenshots for a media path
func (a *App) DeletePreviewScreenshots(mediaPath string) error {
	settings := a.GetSettings()
	baseName := filepath.Base(mediaPath)
	tmpDir := filepath.Join(settings.UAPath, "tmp", baseName)
	previews, _ := filepath.Glob(filepath.Join(tmpDir, "PREVIEW-*.png"))
	for _, p := range previews {
		os.Remove(p)
	}
	return nil
}
