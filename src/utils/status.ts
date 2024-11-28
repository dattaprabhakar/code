export class APIResponse {
    public status: any;
    public message: any;
    public trip: any;
    constructor(status = 400, message = '', trip = {}) {
        this.status = status;
        this.message = message;
        this.trip = trip;
    }
}
export class CONFIG_APIResponse {
    public status: any;
    public message: any;
    public config: any;
    constructor(status = 400, message = '', config = {}) {
        this.status = status;
        this.message = message;
        this.config = config;
    }
}
export class Response {
    public status: any;
    public message: any;
    public data: any;
    constructor(status = 400, message = '', data = '') {
        this.status = status;
        this.message = message;
        this.data = data;
    }
}

export class tokenResponse {
    public status: any;
    public message: any;
    public token: any;
    public clientkey: any;
    public userid: any;
    public expiryIn: any;
    constructor(status = 400, message = '', token = '', clientkey = '', userid = '', expiryIn = '') {
        this.status = status;
        this.message = message;
        this.token = token;
        this.clientkey = clientkey;
        this.userid = userid;
        this.expiryIn = expiryIn;
    }
}

export class configTokenResponse {
    public status: any;
    public message: any;
    public token: any;
    public userid: any;
    public clientid: any;
    public adminid: any;
    public expiryIn: any;
    constructor(status = 400, message = '', token = '', userid = '', clientid = '', adminid = '', expiryIn = '') {
        this.status = status;
        this.message = message;
        this.token = token;
        this.userid = userid;
        this.clientid = clientid;
        this.adminid = adminid;
        this.expiryIn = expiryIn;
    }
}
export class details {
    public status: any
    public message: any
    public data: any
    constructor(status, message, data: {}) {
        this.status = status;
        this.message = message;
        this.data = data;
    }
}
export class ResponseWithOnlyPage {
    public sts: any;
    public msg: any;
    public page: any;
    constructor(sts = 200, msg = '', page = {}) {
        this.sts = sts;
        this.msg = msg;
        this.page = page;
    }
}
export class Page {
    pageno: Number = 0
    pages: Number = 0
    size: Number = 0
    total: Number = 0
    constructor(pageno = 1, pages = 0, size = 10, total = 0) {
        this.pageno = pageno;
        this.pages = pages;
        this.size = size;
        this.total = total
    }
}

export class APIError {
    public status: Number;
    public msg: String;
    constructor(code = 400, message) {
        this.msg = message;
        this.status = code
    }
}

export class tokenResponseAutoMarket {
    public status: any;
    public message: any;
    public token: any;
    public userid: any;
    constructor(status = 400, message = '', token = '', userid = '') {
        this.status = status;
        this.message = message;
        this.token = token;
        this.userid = userid;
    }
}

export class LoginResponse {
    status: any
    message: any
    details: any
    //  hdata: any
    //  adata: any
    // user_existance: string //tyepes = [new,exist,notfound] 

    // widgetsenablelist: any
    //accessRights: any;
    // featureAvailability: any;
    constructor(status, message, details) {
        this.status = status
        this.message = message
        // this.hdata = hdata
        //  this.adata = adata
        this.details = details
        // this.widgetsenablelist = widgetsenablelist
        // this.accessRights = accessRights
        // this.featureAvailability = featureAvailability
    }
}


export class ResponseWithObject {
    public status: any;
    public message: any;
    public details: any;
    constructor(status = 200, message = '', details = {}) {
        this.status = status;
        this.message = message;
        this.details = details;
    }
}


export class ResponseLocation {
    public status: any;
    public message: any;
    constructor(status = 200, message = '',) {
        this.status = status;
        this.message = message;
    }
}


export class apitokenResponse {
    public status: any;
    public message: any;
    public token: any;
    public clientkey: any;
    public tokenuserid: any;
    public expiryIn: any;
    constructor(status = 400, message = '', token = '', clientkey = '', userid = '', expiryIn = '') {
        this.status = status;
        this.message = message;
        this.token = token;
        this.clientkey = clientkey;
        this.tokenuserid = userid;
        this.expiryIn = expiryIn;
    }
}

export class LOCResponse {
    public status: any;
    public message: any;
    public networkType: any;
    public expiry_time: any;
    public consent_status: any;
    constructor(status = 400, message = '', networkType = "JIO", expiry_time, consent_status) {
        this.status = status;
        this.message = message;
        this.networkType = networkType;
        this.expiry_time = expiry_time;
        this.consent_status = consent_status;
    }
}

export class APIResponseForConsent {
    public status: any;
    public message: any;
    constructor(status = 400, message = '') {
        this.status = status;
        this.message = message;
    }
}

export class APIResponseForConsentNew {
    public status: any;
    public message: any;
    public consentValidity: any;
    constructor(status = 400, message = '', consentValidity = '') {
        this.status = status;
        this.consentValidity = consentValidity;
        this.message = message;
    }
}

export class LOCResponseWithLatLangs {
    public status: any;
    public message: any;
    public networkType: any;
    public expiry_time: any;
    public consent_status: any;
    public lat: any;
    public lng: any;
    constructor(status = 400, message = '', networkType = "JIO", expiry_time, consent_status, lat,lng) {
        this.status = status;
        this.message = message;
        this.networkType = networkType;
        this.expiry_time = expiry_time;
        this.consent_status = consent_status;
        this.lat = lat;
        this.lng =lng;
    }
}
export class SHARETRIPResponse {
    public status: any;
    public message: any;
    constructor(status = 400, message = '') {
        this.status = status;
        this.message = message;
    }
}