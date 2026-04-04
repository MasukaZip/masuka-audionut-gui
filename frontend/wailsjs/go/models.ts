export namespace main {
	
	export class AppSettings {
	    uaPath: string;
	    destPath: string;
	    qbitHost: string;
	    qbitUser: string;
	    qbitPass: string;
	    autoMove: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.uaPath = source["uaPath"];
	        this.destPath = source["destPath"];
	        this.qbitHost = source["qbitHost"];
	        this.qbitUser = source["qbitUser"];
	        this.qbitPass = source["qbitPass"];
	        this.autoMove = source["autoMove"];
	    }
	}
	export class TrackerStat {
	    tracker: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new TrackerStat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tracker = source["tracker"];
	        this.count = source["count"];
	    }
	}
	export class UploadStat {
	    totalUploads: number;
	    totalSizeGB: string;
	    successRate: string;
	
	    static createFrom(source: any = {}) {
	        return new UploadStat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalUploads = source["totalUploads"];
	        this.totalSizeGB = source["totalSizeGB"];
	        this.successRate = source["successRate"];
	    }
	}
	export class DashboardData {
	    stats: UploadStat;
	    trackers: TrackerStat[];
	
	    static createFrom(source: any = {}) {
	        return new DashboardData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.stats = this.convertValues(source["stats"], UploadStat);
	        this.trackers = this.convertValues(source["trackers"], TrackerStat);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HealthCheckResult {
	    python: string;
	    ffmpeg: string;
	    git: string;
	
	    static createFrom(source: any = {}) {
	        return new HealthCheckResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.python = source["python"];
	        this.ffmpeg = source["ffmpeg"];
	        this.git = source["git"];
	    }
	}
	export class ScreenshotResult {
	    path: string;
	    base64: string;
	    index: number;
	
	    static createFrom(source: any = {}) {
	        return new ScreenshotResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.base64 = source["base64"];
	        this.index = source["index"];
	    }
	}
	export class TMDBResult {
	    tmdb: string;
	    imdb: string;
	    tvdb: string;
	    poster: string;
	    type: string;
	
	    static createFrom(source: any = {}) {
	        return new TMDBResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tmdb = source["tmdb"];
	        this.imdb = source["imdb"];
	        this.tvdb = source["tvdb"];
	        this.poster = source["poster"];
	        this.type = source["type"];
	    }
	}
	
	export class UploadEntry {
	    id: number;
	    nome: string;
	    tracker: string;
	    tamanho: number;
	    data: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new UploadEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.nome = source["nome"];
	        this.tracker = source["tracker"];
	        this.tamanho = source["tamanho"];
	        this.data = source["data"];
	        this.status = source["status"];
	    }
	}
	export class UploadRequest {
	    path: string;
	    tracker: string;
	    category: string;
	    screens: number;
	    imageHost: string;
	    tmdb: string;
	    imdb: string;
	    mal: string;
	    tvdb: string;
	    res: string;
	    type: string;
	    debug: boolean;
	    internal: boolean;
	    personal: boolean;
	    keepImg: boolean;
	    noSeed: boolean;
	    skipDupe: boolean;
	    cleanup: boolean;
	    forceScreens: boolean;
	    ffdebug: boolean;
	    autoY: boolean;
	    autoMove: boolean;
	    destPath: string;
	
	    static createFrom(source: any = {}) {
	        return new UploadRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.tracker = source["tracker"];
	        this.category = source["category"];
	        this.screens = source["screens"];
	        this.imageHost = source["imageHost"];
	        this.tmdb = source["tmdb"];
	        this.imdb = source["imdb"];
	        this.mal = source["mal"];
	        this.tvdb = source["tvdb"];
	        this.res = source["res"];
	        this.type = source["type"];
	        this.debug = source["debug"];
	        this.internal = source["internal"];
	        this.personal = source["personal"];
	        this.keepImg = source["keepImg"];
	        this.noSeed = source["noSeed"];
	        this.skipDupe = source["skipDupe"];
	        this.cleanup = source["cleanup"];
	        this.forceScreens = source["forceScreens"];
	        this.ffdebug = source["ffdebug"];
	        this.autoY = source["autoY"];
	        this.autoMove = source["autoMove"];
	        this.destPath = source["destPath"];
	    }
	}

}

