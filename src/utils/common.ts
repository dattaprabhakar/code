import sha256 from 'sha256'
import { microservicesurl } from './../utils/config';
import * as CryptoJS from 'crypto-js';
import moment from 'moment';
import { APIResponse, details } from './status';
import { ALREADY_EXISTS_MSG, INVALID_CREDENTIALS_MSG, NO_DATA_AVL_MSG, SOMETHING_WENT_MSG, SUCCESS_MSG } from './errormsg';
import axios from 'axios';
const request = require('request');
import * as tunnel from 'tunnel';
const https = require('https');
const path = require("path");
const fs = require('fs');

export async function getEncryptPassword(password) {
    return sha256.x2(password);
}


async function validatedata(innervalues: any) {
    for (let i = 0; i < innervalues.length; i++) {
        const elem = String(innervalues[i]);
        if (elem) {
            if (elem.includes('<') || elem.includes('>') || elem.includes('&lt') || elem.includes('&gt')) {
                return 'true';
            }
            if (elem.startsWith('%') || elem.startsWith('@') || elem.startsWith('=') || elem.startsWith('|') || elem.startsWith('-') || elem.startsWith('+')) {
                return 'true';

            }
        }
    }
}

//The set method is use for encrypt the password value.
export async function setEncryptString(value) {
    var key = CryptoJS.enc.Utf8.parse(microservicesurl.cryptoJsSecretKey);
    var iv = CryptoJS.enc.Utf8.parse(microservicesurl.cryptoJsSecretKey);
    var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse((value)), key,
        {
            keySize: 128 / 8,
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
    return encrypted.toString();
}

export async function validateJsonData(req: any) {

    try {
        var isValid = 'false';
        var values = Object.keys(req).map(function (key) { return req[key]; });
        // let data = await GetKeyValuePairs(req);

        if (values.length > 0) {
            for (let index = 0; index < values.length; index++) {
                var jsonvalue = values[index];
                if (jsonvalue) {
                    if (Array.isArray(jsonvalue)) {
                        if (jsonvalue.length > 0) {
                            const arrayelement = jsonvalue[0];
                            if (arrayelement) {
                                if (typeof (arrayelement) === 'object') {
                                    for (let k = 0; k < jsonvalue.length; k++) {
                                        const jsonarrayvalue = jsonvalue[k];
                                        if (jsonarrayvalue) {
                                            var arrayinnervalues = Object.keys(jsonarrayvalue).map(function (key) { return jsonarrayvalue[key]; });
                                            isValid = await validatedata(arrayinnervalues);
                                            if (isValid == 'true') {
                                                break;
                                            }
                                        }
                                    }
                                }
                                else {
                                    isValid = await validatedata(jsonvalue);
                                    if (isValid == 'true') {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    else if (typeof (jsonvalue) === 'object') {
                        var innervalues = Object.keys(jsonvalue).map(function (key) { return jsonvalue[key]; });
                        if (innervalues.length > 0) {
                            for (let index = 0; index < innervalues.length; index++) {
                                const innerelement = innervalues[index];
                                if (innerelement) {
                                    if (typeof (innerelement) === 'object') {
                                        var arrayinnervalues: any[] = Object.keys(innerelement).map(function (key) { return innerelement[key]; });
                                        for (let j = 0; j < arrayinnervalues.length; j++) {
                                            const arrayelement = arrayinnervalues[j];
                                            if (arrayelement) {
                                                if (Array.isArray(arrayelement)) {
                                                    if (arrayelement.length > 0) {
                                                        const arrayelemObj = arrayelement[0];
                                                        if (arrayelemObj) {
                                                            if (typeof (arrayelemObj) === 'object') {
                                                                var innervalue: any[] = Object.keys(arrayelemObj).map(function (key) { return arrayelemObj[key]; });
                                                                isValid = await validatedata(innervalue);
                                                                if (isValid == 'true') {
                                                                    break;
                                                                }
                                                            }
                                                            else {
                                                                isValid = await validatedata(arrayelement);
                                                                if (isValid == 'true') {
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                else if (typeof (arrayelement) === 'object') {
                                                    var objinnervalues = Object.keys(arrayelement).map(function (key) { return arrayelement[key]; });

                                                    isValid = await validatedata(objinnervalues);
                                                    if (isValid == 'true') {
                                                        break;
                                                    }

                                                }
                                                else {
                                                    const elemen = String(arrayelement);
                                                    if (elemen) {
                                                        if (elemen.includes('<') || elemen.includes('>') || elemen.includes('&lt') || elemen.includes('&gt')) {
                                                            isValid = 'true';
                                                            break;
                                                        }
                                                        if (elemen.startsWith('%') || elemen.startsWith('@') || elemen.startsWith('=') || elemen.startsWith('|') || elemen.startsWith('-') || elemen.startsWith('+')) {
                                                            isValid = 'true';
                                                            break;
                                                        }

                                                    }
                                                }
                                                if (isValid == 'true') {
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        const element = String(innerelement);
                                        if (element) {
                                            if (element.includes('<') || element.includes('>') || element.includes('&lt') || element.includes('&gt')) {
                                                isValid = 'true';
                                                break;

                                            }
                                            if (element.startsWith('%') || element.startsWith('@') || element.startsWith('=') || element.startsWith('|') || element.startsWith('-') || element.startsWith('+')) {
                                                isValid = 'true';
                                                break;
                                            }
                                        }
                                    }

                                    if (isValid == 'true') {
                                        break;
                                    }
                                }

                            }

                        }
                    }
                    else {
                        const element = String(jsonvalue);
                        if (element) {
                            if (element.includes('<') || element.includes('>') || element.includes('&lt') || element.includes('&gt')) {
                                isValid = 'true';
                                break;
                            }
                            if (element.startsWith('%') || element.startsWith('@') || element.startsWith('=') || element.startsWith('|') || element.startsWith('-') || element.startsWith('+')) {
                                isValid = 'true';
                                break;
                            }
                        }
                    }
                    if (isValid == 'true') {
                        break;
                    }
                }
            }
        }
        else {
            return { status: 204, message: "Invalid input" }
        }

        if (isValid == 'true') {
            return { status: 204, message: "Invalid input" }
        }
        else {
            return { status: 200, message: "Valid input" }
        }
    }
    catch (e) {

        return { status: 200, message: "Invalid input" }

    }
}
export async function SIMRegistration_V1(body: any) {
    try {
        return new Promise(async (resolve, reject) => {
            await simtrackstatus(body.drivermobile).then(async (statusres: any) => {
                if (statusres.status == 200) {
                    if (statusres.data[0].status === "1") {
                        let simtrackdate = moment(new Date());
                        let durationindays: Number = statusres.data[0].durationindays;
                        let newsimtrackdate: any = simtrackdate.add(Number(durationindays), 'days');
                        body["simtrackdatetime"] = simtrackdate;
                        body["simtrackdurationindays"] = durationindays;
                        body["simtrackexpiredate"] = moment(new Date(newsimtrackdate)).format("YYYY-MM-DD HH:mm:ss");
                        body["durationindays"] = durationindays;
                        body["network_type"] = "2";

                        if (microservicesurl.issecenable) {
                            await seco_verification(body.drivermobile).then(async (seco_res: any) => {
                                if (seco_res.status == 200) {
                                    body.network_type = seco_res.data.isValidJioNumber;
                                    if (seco_res.data.isValidJioNumber == "0") {
                                        body.carrier = "Non Jio";
                                        if (microservicesurl.isedgeenable) {
                                            await edge_sendconsent(body.drivermobile).then(async (edge_consent_res: any) => {
                                                if (edge_consent_res.status == 200) {

                                                    await deviceRegister(body).then(async (deviceRes: any) => {
                                                        resolve(deviceRes);
                                                    }).catch(ex => {
                                                        console.log("Exception in deviceRegister() :  " + ex.message);
                                                        resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                                    });

                                                }
                                                else {
                                                    resolve(edge_consent_res)
                                                }
                                            });
                                        }
                                        else {
                                            await deviceRegister(body).then(async (deviceRes: any) => {
                                                resolve(deviceRes);
                                            }).catch(ex => {
                                                console.log("Exception in deviceRegister() :  " + ex.message);
                                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                            });
                                        }
                                    }
                                    else {
                                        body.carrier = "Jio";
                                        if (microservicesurl.isfmsenable) {

                                            await fms_sendconsent(body).then(async (fms_consent_res: any) => {
                                                if (fms_consent_res.status == 200) {
                                                    await deviceRegister(body).then(async (deviceRes: any) => {
                                                        resolve(deviceRes);
                                                    }).catch(ex => {
                                                        console.log("Exception in deviceRegister() :  " + ex.message);
                                                        resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                                    });
                                                }
                                                else {
                                                    resolve(fms_consent_res)
                                                }

                                            }).catch(ex => {
                                                console.log("Exception in fms_sendconsent() :  " + ex.message);
                                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                            });
                                        }
                                        else {
                                            await deviceRegister(body).then(async (deviceRes: any) => {
                                                resolve(deviceRes);
                                            }).catch(ex => {
                                                console.log("Exception in deviceRegister() :  " + ex.message);
                                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                            });
                                        }
                                    }
                                }
                                else {
                                    resolve(seco_res);
                                }

                            }).catch(error => {
                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                            });
                        }
                        else if (microservicesurl.isedgeenable) {
                            await edge_sendconsent(body.drivermobile).then(async (edge_consent_res: any) => {
                                if (edge_consent_res.status == 200) {
                                    body.network_type = "1";
                                    body.carrier = "Jio";
                                    if (edge_consent_res.data.requestError) {
                                        if (edge_consent_res.data.requestError.serviceException) {
                                            if (edge_consent_res.data.requestError.serviceException.messageId == "SVC0004") {
                                                if (microservicesurl.isfmsenable) {
                                                    await fms_sendconsent(body).then(async (fms_consent_res: any) => {
                                                        if (fms_consent_res.status == 200) {
                                                            await deviceRegister(body).then(async (deviceRes: any) => {
                                                                resolve(deviceRes);
                                                            }).catch(ex => {
                                                                console.log("Exception in deviceRegister() :  " + ex.message);
                                                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                                            });
                                                        }
                                                        else {
                                                            resolve(fms_consent_res)
                                                        }

                                                    }).catch(ex => {
                                                        console.log("Exception in fms_sendconsent() :  " + ex.message);
                                                        resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                                    });
                                                }
                                                else {
                                                    await deviceRegister(body).then(async (deviceRes: any) => {
                                                        resolve(deviceRes);
                                                    }).catch(ex => {
                                                        console.log("Exception in deviceRegister() :  " + ex.message);
                                                        resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                                    });
                                                }
                                            }
                                            else {
                                                console.log("Edge API Exception with messageId : ")
                                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                            }

                                        }
                                        else {
                                            console.log("Edge API Exception with serviceException : ")
                                            resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                        }
                                    }
                                    else if (edge_consent_res.data.errorCode) {
                                        if (edge_consent_res.data.errorCode == 8001001) {
                                            if (microservicesurl.isfmsenable) {
                                                await fms_sendconsent(body).then(async (fms_consent_res: any) => {
                                                    if (fms_consent_res.status == 200) {
                                                        await deviceRegister(body).then(async (deviceRes: any) => {
                                                            resolve(deviceRes);
                                                        }).catch(ex => {
                                                            console.log("Exception in deviceRegister() :  " + ex.message);
                                                            resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                                        });
                                                    }
                                                    else {
                                                        resolve(fms_consent_res)
                                                    }

                                                }).catch(ex => {
                                                    console.log("Exception in fms_sendconsent() :  " + ex.message);
                                                    resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                                });
                                            }
                                            else {
                                                await deviceRegister(body).then(async (deviceRes: any) => {
                                                    resolve(deviceRes);
                                                }).catch(ex => {
                                                    console.log("Exception in deviceRegister() :  " + ex.message);
                                                    resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                                });
                                            }
                                        }
                                    }
                                    else if (edge_consent_res.data.Consent) {
                                        body.network_type = "0";
                                        body.carrier = "Non Jio";
                                        if (edge_consent_res.data.Consent.status == "PENDING" || edge_consent_res.data.Consent.status == "ALLOWED") {
                                            await deviceRegister(body).then(async (deviceRes: any) => {
                                                resolve(deviceRes);
                                            }).catch(ex => {
                                                console.log("Exception in deviceRegister() :  " + ex.message);
                                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                            });
                                        }
                                        else {
                                            console.log("Undefined Consent status");
                                            resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                        }
                                    }
                                    else {
                                        console.log("Undefined Consent");
                                        resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                    }


                                    // res.send(edge_consent_res)
                                }
                                else {
                                    resolve(edge_consent_res);
                                }
                            }).catch(error => {
                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                            });
                        }
                        else {
                            await deviceRegister(body).then(async (deviceRes: any) => {
                                resolve(deviceRes);
                            }).catch(ex => {
                                console.log("Exception in deviceRegister() :  " + ex.message);
                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                            });
                        }
                    }
                    else {
                        resolve(new APIResponse(400, ALREADY_EXISTS_MSG));
                    }
                }
                else {
                    resolve(statusres)
                }
            }).catch(error => {
                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
            });
        })
    }
    catch (ex) {
        return new APIResponse(500, SOMETHING_WENT_MSG)
    }
}
async function simtrackstatus(drivermobile: any) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.usermanagementpath + "/simtrackstatus",
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: { mobilenos: [drivermobile.toString()] },
                json: true
            }

            request(options, function (err, response, body) {
                if (err) {
                    console.log("Error in simtrackstatus() " + err)
                    return resolve(new APIResponse(500, SOMETHING_WENT_MSG))
                }
                else {
                    return resolve(body);
                }
            });
        }).catch(error => {
            console.log("Error in simtrackstatus promise method() " + error.message)
            return new APIResponse(500, SOMETHING_WENT_MSG);
        });
    }
    catch (ex) {
        console.log("Exception in simtrackstatus() " + ex)
        return new APIResponse(500, SOMETHING_WENT_MSG)
    }
}
async function seco_verification(mobileno: string) {
    let httpsAgent: any = new https.Agent({
        cert: fs.readFileSync(path.resolve(__dirname, microservicesurl.certificates.crt)),
        key: fs.readFileSync(path.resolve(__dirname, microservicesurl.certificates.key))
    });

    let reqbody: any = {
        "channelID": microservicesurl.channel_id,
        "serviceIdentifier": [mobileno]
    }

    let jsonheader1: any = {
        'Content-Type': 'application/json',
        'x-api-key': microservicesurl.seco_x_api_key
    }

    return await new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.seco_api, reqbody, { httpsAgent: httpsAgent, headers: jsonheader1 }).then(async (result: any) => {
            if (result.data.isValidJioNumber) {
                resolve(new details(200, SUCCESS_MSG, result.data));
            }
            else {
                resolve(new APIResponse(400, NO_DATA_AVL_MSG));
            }
        }).catch(error => {
            console.log(JSON.stringify(error.message));
            resolve(new APIResponse(500, SOMETHING_WENT_MSG));
        });
    }).catch(error => {
        console.log(JSON.stringify(error.message));
        return new APIResponse(500, SOMETHING_WENT_MSG);
    });
}
async function edge_sendconsent(mobileno: string) {

    if (mobileno.length == 10) {
        mobileno = "91" + mobileno;
    }

    return await new Promise(async (resolve, reject) => {
        let jsonString: string = "grant_type=client_credentials&client_id=" + microservicesurl.edge_client_key + "&client_secret=" + microservicesurl.edge_client_secret;

        let options: any = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }

        if (Boolean(microservicesurl.edge_proxy.isenable)) {
            options["httpsAgent"] = tunnel.httpsOverHttp({
                proxy: {
                    host: microservicesurl.edge_proxy.host,
                    port: microservicesurl.edge_proxy.port,
                },
            });
            options["proxy"] = false;
        }
        else if (microservicesurl.edge_proxy.add_proxy_key_false) {
            options["proxy"] = false;
        }


        await axios.post(microservicesurl.edge_api + "/oauth/token", jsonString, options).then(async (result: any) => {
            if (result.data) {

                let options1: any = {
                    url: microservicesurl.edge_api + "/apigw/consentapi/v1/consent?address=tel:+" + mobileno,
                    method: "GET",
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + result.data.access_token
                    },
                    json: true
                };

                if (Boolean(microservicesurl.edge_proxy.isenable)) {
                    options1["proxy"] = microservicesurl.edge_proxy.protocol_type + "://" + microservicesurl.edge_proxy.host + ":" + microservicesurl.edge_proxy.port;
                }
                else if (microservicesurl.edge_proxy.add_proxy_key_false) {
                    options1["proxy"] = false;
                }

                await request(options1, async function (err, response, edge_consent_res) {
                    if (err) {
                        console.log(moment(new Date()).format() + ", Error in edge_sendconsent() " + err.message)
                        resolve({ status: 500, message: "Exception in Consent Request" });
                    }
                    else {
                        if (edge_consent_res) {
                            resolve(new details(200, SUCCESS_MSG, edge_consent_res));
                        }
                        else {
                            resolve(new APIResponse(400, NO_DATA_AVL_MSG));
                        }
                    }
                });
            }
            else {
                resolve(new APIResponse(500, "Token Request Failed"));
            }
        }).catch(error => {
            console.log(error.message)
            resolve(new APIResponse(500, "Exception in Token Request"));
        });
    }).catch(error => {
        console.log(JSON.stringify(error.message));
        return new APIResponse(500, "Exception in Token Request");
    });

}

async function deviceRegister(body: any) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.usermanagementpath + '/v1/deviceRegister',
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: body,
                json: true
            }

            request(options, function (err, response, body) {
                if (err) {
                    console.log("Error in deviceRegister() " + err)
                    return resolve(new APIResponse(500, SOMETHING_WENT_MSG))
                }
                else {
                    return resolve(new APIResponse(200, "Device registered"));
                }
            });
        }).catch(ex => {
            console.log("Exception in deviceRegister() Promise Method" + ex.message)
            return new APIResponse(500, SOMETHING_WENT_MSG)
        });
    }
    catch (ex) {
        console.log("Exception in deviceRegister() " + ex)
        return new APIResponse(500, SOMETHING_WENT_MSG);
    }
}
async function fms_sendconsent(body: any) {
    return new Promise(async (resolve, reject) => {
        let mobileno = [body.drivermobile.toString()];
        let loginbody: any = { username: microservicesurl.sim_track_username, password: microservicesurl.sim_track_password }
        await simtrackLogin(loginbody).then(async (loginResult: any) => {
            if (loginResult.token) {
                //console.log("Login Success")
                let sim_reg_body = {
                    deviceType: "SIM",
                    mobileNumber: mobileno,
                    consentDurationInDays: body.durationindays,
                    consentMessage: microservicesurl.sim_track_consentMessage + "  " + body.simtrackexpiredate + " - " + body.enterprisename,
                    device_attributes: {
                        driverName: body.drivername,
                        vehicleNumber: body.vehiclenumber
                    }
                }

                await deviceUpload(sim_reg_body, loginResult.token).then(async (regResult: any) => {
                    if (regResult.message) {
                        //console.log("SIM Registered : " + regResult.message)
                        return resolve(new APIResponse(200, SUCCESS_MSG));
                    }
                    else {
                        return resolve(new APIResponse(400, "Registration failed"));
                    }
                }).catch(ex => {
                    console.log("Exception in deviceUpload() : " + ex.message);
                    return new APIResponse(500, SOMETHING_WENT_MSG)
                });
            }
            else {
                return resolve(new APIResponse(400, INVALID_CREDENTIALS_MSG));
            }
        }).catch(ex => {
            console.log("Exception in simtrackLogin() : " + ex.message);
            return new APIResponse(500, SOMETHING_WENT_MSG);
        });
    }).catch(ex => {
        console.log("Exception in fms_sendconsent promise method : " + ex.messsage)
        return new APIResponse(500, SOMETHING_WENT_MSG)
    });

}
export async function simtrackLogin(body: any) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.sim_track_api_url + "/login",
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: body,
                json: true
            }

            if (microservicesurl.fms_proxy.isenable) {
                options["proxy"] = microservicesurl.fms_proxy.protocol_type + "://" + microservicesurl.fms_proxy.host + ":" + microservicesurl.fms_proxy.port
            } else if (microservicesurl.fms_proxy.add_proxy_key_false) {
                options["proxy"] = false;
            }

            request(options, function (err, response, body) {
                if (err) {
                    console.log("Error in simtrackLogin() " + err)
                    return resolve(new APIResponse(500, SOMETHING_WENT_MSG))
                }
                else {
                    return resolve(body);
                }
            });
        });
    }
    catch (ex) {
        console.log("Exception in simtrackLogin() " + ex)
        return new APIResponse(500, SOMETHING_WENT_MSG)
    }
}
async function deviceUpload(body: any, token) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.sim_track_api_url + "/devices/deviceUpload",
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    'x-access-token': token
                },
                body: body,
                json: true
            }

            if (microservicesurl.fms_proxy.isenable) {
                options["proxy"] = microservicesurl.fms_proxy.protocol_type + "://" + microservicesurl.fms_proxy.host + ":" + microservicesurl.fms_proxy.port
            } else if (microservicesurl.fms_proxy.add_proxy_key_false) {
                options["proxy"] = false;
            }

            request(options, function (err, response, body) {
                if (err) {
                    console.log("Error in deviceUpload() " + err)
                    return resolve(new APIResponse(500, SOMETHING_WENT_MSG))
                }
                else {
                    return resolve(body);
                }
            });
        });
    }
    catch (ex) {
        console.log("Exception in deviceUpload() " + ex)
        return new APIResponse(500, SOMETHING_WENT_MSG)
    }
}

export async function isUserLogin(userid, token, cntrlName) {
    let isLogin = false;
    let tokens = [];
    let path = "";
    if (cntrlName == "autoMarket") {
        path = microservicesurl.configurationpath + "v1/get-login-user";
    } else if (cntrlName == "configuration") {
        path = microservicesurl.configurationpath + "v1/get-config-login-user";
    }else if (cntrlName == "trips") {
        path = microservicesurl.trips + "v1/get-trips-login-user";
    }else if (cntrlName == "jioAutoConnected") {
        path = microservicesurl.trips + "v1/get-jioAutoConnected-login-user";
    }
    let reqObj = { userid, token }

    return new Promise(async (resolve, reject) => {

        await axios.post(path,
            reqObj).then(result => {
                let response = result.data;
                //console.log("responce status" + response.status);
                if (response.status == 200) {
                    isLogin = true;
                    tokens = response.data?.tokens ? response.data.tokens : []
                }
                //console.log("isLogin value" + isLogin);
                resolve({ "isLogin": isLogin, "tokens": tokens, adminemailid: response.data.adminemailid ? response.data.adminemailid : "" })
                //resolve({ "isLogin": isLogin, "tokens": tokens})
            }).catch(error => {
                resolve({ "isLogin": isLogin, "tokens": tokens, adminemailid: "" })
                console.log("Error in isUserLogin:" + error.message);
            });
    });
}



export async function getSubscriptionDetails(userid) {
    try {
        let reqObj = { userid }
        let subscription: any = 0
        return new Promise(async (resolve, reject) => {
            await axios.post(microservicesurl.trips + "getsubscriptionDetails",
                reqObj).then(userTokenAsync => {
                    if (userTokenAsync?.status == 200) {
                        subscription = userTokenAsync?.data?.data?.subscription ? userTokenAsync?.data?.data?.subscription : ""
                    }
                    resolve({ subscription: subscription })
                }).catch(error => {
                    resolve({ subscription: subscription })
                    console.log("Error in Inner Catch getSubscriptionDetails:" + error.message);
                });
        });
    } catch (ex) {
        console.log("Error in Outer Catch getSubscriptionDetails:" + ex.message);
        return new APIResponse(500, SOMETHING_WENT_MSG)
    }
}

export async function isUserLogin_v1(userid, token) {
    console.log("isUserLogin_v1 calling..")
    let isLogin = false;
    let tokens = [];
    let path = microservicesurl.trips + "v2/get-login-user";
    let reqObj = { userid, token }
    return new Promise(async (resolve, reject) => {
        await axios.post(path,
            reqObj).then(result => {
                let response = result.data;
                console.log("Responce for isUserLogin_v1 : " + JSON.stringify(response))
                //console.log("responce status" + response.status);
                if (response.status == 200) {
                    isLogin = true;
                    tokens = response.data?.tokens ? response.data.tokens : []
                }
                //console.log("isLogin value" + isLogin);
                 resolve({ "isLogin": isLogin, "tokens": tokens, adminemailid: response.data.adminemailid ? response.data.adminemailid : "" })
                //resolve({ "isLogin": isLogin, "tokens": tokens })
            }).catch(error => {
                resolve({ "isLogin": isLogin, "tokens": tokens, adminemailid: "" })
                console.log("Error in isUserLogin_v1:" + error.message);
            });
    });
}
