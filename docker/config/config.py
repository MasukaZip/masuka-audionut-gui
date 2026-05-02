# Preencha este arquivo com suas chaves e configurações.
# Depois copie para ./config/config.py antes de subir o container.

config = {
    # --- APIs obrigatórias ---
    "tmdb_api": "SUA_CHAVE_TMDB",          # https://www.themoviedb.org/subscribe/developer
    "imgbb_api": "SUA_CHAVE_IMGBB",        # https://api.imgbb.com/

    # --- Tracker padrão (deixe vazio para escolher manualmente em cada envio) ---
    "default_trackers": "",

    # --- Configuração do tracker (adicione quantos quiser) ---
    "trackers": {
        "CBR": {
            "api_key": "SUA_API_KEY",              # perfil > API Keys no tracker
            "announce_url": "SUA_ANNOUNCE_URL",    # disponível na página de criação de torrent
        }
    },

    # --- Cliente de torrent ---
    "torrent_clients": {
        "Client1": {
            "torrent_client": "qbit",
            "enable_search": True,
            "qbit_url": "http://qbittorrent",
            "qbit_port": "8080",
            "qbit_user": "SEU_USUARIO_QBIT",
            "qbit_pass": "SUA_SENHA_QBIT",
        }
    },
}
