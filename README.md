# Upload Assistant GUI

> **Aviso da Comunidade:** Eu sei que o desenvolvedor original do projeto (Audionut) está trabalhando no desenvolvimento de uma GUI oficial. Eu criei esta interface (usando Go + React) primeiramente para uso próprio, como uma prova de conceito para testar algumas ideias, mas o resultado final ficou tão bom prático que decidi abrir o repositório e compartilhar com a comunidade!

Uma interface gráfica limpa, moderna e leve desenvolvida para facilitar o processo de upload em Trackers Privados — agora com suporte a **filmes, séries, cursos, ebooks e vídeos** em uma única ferramenta.

---

## Screenshots

| Aba Upload — Pré-visualização de Screenshots | Opções e Log de Progresso |
|:---:|:---:|
| ![Aba Upload](screenshots/tela-upload.png) | ![Opções e Upload](screenshots/tela-opcoes.png) |

| Aba Renomear e Info |
|:---:|
| ![Renomear](screenshots/tela-renomear.png) |

---

## Motores Integrados

Este projeto atua como um frontend unificado para dois scripts de upload da comunidade, centralizando tudo em uma interface só.

### Upload-Assistant (Audionut)
O motor principal, responsável por toda a comunicação com trackers, criação de torrents e automações de media info para **filmes e séries**. Mantido e desenvolvido pelo dev **[Audionut](https://github.com/Audionut/Upload-Assistant)**.

### PR1MATE PDF (n1njapr1mate)
Motor auxiliar integrado em parceria, responsável pelos uploads de **cursos, ebooks e vídeos**. Desenvolvido pelo dev **[n1njapr1mate](https://gitlab.com/n1njapr1mate/pr1mate-pdf)**. A GUI conecta diretamente ao script e expõe todas as opções de forma visual, sem precisar abrir o terminal.

---

## O que este projeto automatiza?

### Aba Upload (UP) — Filmes e Séries
A central principal onde a automação para geração do torrent acontece:

* **Integração Automática (TMDB/IMDB):** O sistema lê sua mídia, limpa o título de "tags" pesadas e em milissegundos bate lá na API do TMDB voltando com o ID exato e os posters de capa.
* **Radar Inteligente:** A interface descobre sozinha se é um Filme ou Série, além da sua Resolução (1080p/2160p) e Fonte (WEB-DL/Remux) interpretando o prefixo da mídia baixada no seu HD.
* **Validação Anti-Erro (FFprobe):** Antes de gerar o torrent, a ferramenta analisa seu vídeo por dentro. Se você selecionou a opção "DUAL", mas o vídeo só tem áudio em Português, o programa barra na tela. Evitando perdas de conta nos trackers.
* **Bloqueio de Grupos Banidos:** Ao selecionar um arquivo, a GUI verifica automaticamente se o grupo de release está na lista de grupos banidos pelo tracker. Se estiver, o envio é bloqueado com alerta visual antes mesmo de você tentar subir.
* **Gestor de qBittorrent:** Configurou sua WebUI nos Ajustes? A interface interage com seu cliente de torrents e ao finalizar envia um "Move" da pasta Temp pra conta definitiva de "Seed".
* **Aprovação Automática:** O motor Python muitas vezes "trava" rodando um pedido de "yes/no/cancel". A interface segura essa trava pelas costas mandando um `y` automático e o processo flui intacto até o fim.
* **Galeria de Pré-Visualização:** Tire screenshots randômicas do vídeo direto na interface, jogue num lightbox e veja na hora se a cena não capturou letreiros e borrões.

### Aba PR1MATE PDF — Cursos, Ebooks e Vídeos
Interface dedicada para o motor PR1MATE PDF com todas as opções acessíveis visualmente:

* **Seleção por Arraste:** Arraste a pasta ou arquivo direto para a interface.
* **Auto-preenchimento de Título:** O nome da pasta é preenchido automaticamente no campo título.
* **Modos de Upload:** Suporte a Curso, Ebook e Vídeo com seletor de categoria (Programação, Design, Medicina, Finanças e mais de 30 categorias).
* **Opções Avançadas:** Multi-torrent, descrição detalhada com estrutura de pastas e screenshots, assinatura padrão — tudo com tooltips explicativos.
* **Poster e Banner:** Seleção visual de imagens de capa e banner com dimensões recomendadas.
* **Console em Tempo Real:** Log completo do processo diretamente na interface, sem precisar abrir terminal.

### Aba Renomear — Padronização de Nomes
Pega um nome sujo e converte pro formato correto do tracker:

* **Categorias suportadas:** Filme, Série, Anime, Documentário, Livro, HQ / Manga, Audiobook, Revista e Curso.
* **Validação por categoria:** Cada categoria exige campos específicos e a interface avisa o que está faltando antes de gerar o nome.
* **Cópia com um clique:** Resultado formatado pronto pra copiar direto para o campo de upload.

> **Aviso Importante sobre Padrões:** As regras de renomeação seguem **única e exclusivamente os padrões e exigências restritas do Tracker Capybara (CBR)**.

---

## Configurações e Manutenção

A aba **Configurações** centraliza tudo:

* **Caminhos dos Motores:** Upload-Assistant e PR1MATE PDF configurados separadamente.
* **qBittorrent API:** Host, usuário e senha para automação de movimentação.
* **Editor de config.py:** Edite as APIs e diretórios do Upload-Assistant diretamente na interface, sem abrir o arquivo manualmente.
* **Auto-Update:** Botões de "Git Pull" para cada motor, atualizando para a versão mais recente do repositório oficial com um clique.
* **Check Health:** Verifica se Python, FFmpeg e Git estão instalados e configurados corretamente no PATH do Windows.
* **Backup:** Gera uma cópia de segurança do banco de dados de estatísticas e configurações.

---

## Docker

A forma mais simples de rodar a interface — sem instalar Python, Go, Node.js ou ffmpeg na sua máquina.

### 1 — Copie o exemplo de compose

Baixe o arquivo [`docker-compose.example.yml`](docker-compose.example.yml), renomeie para `docker-compose.yml` e ajuste os volumes conforme seu ambiente:

```yaml
services:
  masuka-audionut-gui:
    image: ghcr.io/masukazip/masuka-audionut-gui:latest
    restart: unless-stopped
    ports:
      - "34115:34115"
    volumes:
      - ./config:/config   # configurações — preenchidas após o primeiro start
      - /data:/data        # seu /data compartilhado com qBittorrent, Sonarr, etc.
      - ./state:/state     # banco de dados e estado persistente
```

### 2 — Suba o container

```bash
docker compose up -d
```

### 3 — Preencha as configurações

Na primeira execução o container cria automaticamente dois arquivos em `./config/`:

| Arquivo | O que configurar |
|---|---|
| `config.py` | Chaves de API (TMDB, imgbb), tracker (api_key, announce_url) e cliente de torrent |
| `gui_settings.json` | Caminhos dos motores, qBittorrent e pasta de destino |

Edite os arquivos, depois reinicie:

```bash
docker compose restart
```

### 4 — Acesse

Abra o navegador em **http://localhost:34115**

> O volume `/data` deve ser o mesmo diretório raiz usado pelo qBittorrent e pelos *arr — assim os hardlinks funcionam corretamente entre a pasta de download e a biblioteca de mídia.

---

## Instalação manual

### 1 — Dependências base

* **Upload-Assistant:** Clone o repositório do [Audionut](https://github.com/Audionut/Upload-Assistant), instale as dependências (`pip install -r requirements.txt`) e preencha o `data/config.py`.
* **PR1MATE PDF:** Clone o repositório:
  ```bash
  git clone https://gitlab.com/n1njapr1mate/pr1mate-pdf.git
  ```
  Instale as dependências listadas no repositório do script.
* **FFmpeg:** Baixe os binários em [GyanD](https://github.com/GyanD/codexffmpeg/releases) e adicione ao PATH do Windows.
* **Git:** Necessário para o Auto-Update. Baixe em [git-scm.com](https://git-scm.com/download/win).

### 2 — Ferramentas da GUI

* **[Golang](https://go.dev/dl/)**
* **[Node.JS LTS](https://nodejs.org/en/)**
* **Wails CLI:**
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```
  > Após instalar, o executável do Wails fica em `%USERPROFILE%\go\bin`. Se ao rodar `wails dev` aparecer **"wails não é reconhecido como comando"**, adicione essa pasta ao PATH do Windows: `Painel de Controle > Variáveis de Ambiente > Path > Novo > %USERPROFILE%\go\bin`

### 3 — Rodando

Dentro da pasta da GUI, execute:
```bash
wails dev
```

O console compilará e a interface abrirá em modo Dev com live reload. Fechar a janela encerra tudo.
