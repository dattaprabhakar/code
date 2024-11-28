var fs = require("fs");
var config = fs.readFileSync("./thirdpartyconfig.json");
let config_details = JSON.parse(config);


export const Token = {
    TokenExpiryLimitMin: config_details.token_expiry_limit_min,
    jioapi: config_details.jioapi,
    Exists: "existed",
    NotFound: "notfound",
    New: "new",
    //jiodatamanagementapi: config_details.jmtiSITurl,
    userName:config_details.dais.username,
    password:config_details.dais.password,
    enterpriseid:config_details.enterpriseid,
    jmtiurl : config_details.jmtiurl,
    jmtiadminkey : config_details.jmtiadminkey,
    jmtienterpriseurl : config_details.jmtienterpriseurl,  

}

export const microservicesurl = {
    trips: config_details.trips_url,
    jhsDashboard: config_details.jhsDashboard_url,
    booking:config_details.booking_url,
    marketVehicle_CAM_url: config_details.marketVehicle_CAM_url,
    base_key: config_details.base_key,
    JWT_HOURS: config_details.jwt_hours,
    configurationpath: config_details.configuration_url,
    cryptoJsSecretKey: config_details.cryptoJsSecretKey,
    sim_track_api_url: config_details.sim_track_api_url,
    usermanagementpath: config_details.usermanagement_url,
    sim_track_username: config_details.sim_track_username,
    sim_track_password: config_details.sim_track_password,
    sim_track_consentMessage: config_details.sim_track_consentMessage,

    isfmsenable: config_details.isfmsenable,
    certificates: {
        crt: config_details.certificates.crt,
        key: config_details.certificates.key
    },
    seco_api: config_details.seco_api,
    seco_x_api_key: config_details.seco_x_api_key,
    channel_id: config_details.channel_id,
    isedgeenable: config_details.isedgeenable,
    issecenable: config_details.issecenable,
    edge_api: config_details.edge_api,
    edge_client_key: config_details.edge_client_key,
    edge_client_secret: config_details.edge_client_secret,
    edge_proxy: {
        isenable: config_details.edge_proxy.isenable,
        protocol_type: config_details.edge_proxy.protocol_type,
        host: config_details.edge_proxy.host,
        port: config_details.edge_proxy.port,
        add_proxy_key_false: config_details.edge_proxy.add_proxy_key_false
    },
    fms_proxy: {
        isenable: config_details.fms_proxy.isenable,
        protocol_type: config_details.fms_proxy.protocol_type,
        host: config_details.fms_proxy.host,
        port: config_details.fms_proxy.port,
        add_proxy_key_false: config_details.fms_proxy.add_proxy_key_false
    },
    isRedisCache: config_details.isRedisCache,
    unregistered_consent_status: config_details.unregistered_consent_status,   
    jmti_url: config_details.jmti.jmti_url,
    jmti_api_key: config_details.jmti.jmti_api_key,  
    jca_url: config_details.jca_url
}
export var loggerDetails: any = {
    logger: "",
    siemLogger: ""
}