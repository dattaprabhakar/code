import sha256 from 'sha256'
import { ALREADY_EXISTS_MSG, BAD_REQ, NO_DATA_AVL_MSG, SOMETHING_WENT_MSG, SUCCESS_MSG, UNAUTH_MSG } from '../utils/errormsg';
import { microservicesurl } from './../utils/config';
import axios from 'axios';
import { APIResponse, APIResponseForConsent, APIResponseForConsentNew, details, LOCResponse, LOCResponseWithLatLangs } from './../utils/status';
import moment from 'moment';
const axiosRequest = require('axios');
const request = require('request');
//import * as CryptoJS from 'crypto-js';
const fs = require('fs');
const https = require('https');
import * as tunnel from 'tunnel';

const INVALID_CREDENTIALS_MSG = 'Invalid Credentials';

const path = require("path");
export function formatDate(date) {
    if (date) {
        var d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2)
            month = '0' + month;
        if (day.length < 2)
            day = '0' + day;

        return [year, month, day].join('-');
    }


}
export function formatDatetime(date) {
    if (date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        var strTime = hours + ':' + minutes + ' ' + ampm;
        return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + "  " + strTime;
    }

}

export async function SIMRegistration(body: any) {
    try {
        return new Promise(async (resolve, reject) => {
            let mobileno = { mobilenos: [body.drivermobile.toString()] };
            await simtrackstatus(body.drivermobile).then(async (statusres: any) => {
                if (statusres.status == 200) {
                    if (statusres.data[0].status == "1") {
                        if (microservicesurl.isfmsenable) {
                            let loginbody: any = { username: microservicesurl.sim_track_username, password: microservicesurl.sim_track_password }
                            await simtrackLogin(loginbody).then(async (loginResult: any) => {
                                if (loginResult.token) {
                                    console.log("Login Success")
                                    let simtrackdate = moment(new Date());
                                    let durationindays: Number = statusres.data[0].durationindays;
                                    let newsimtrackdate: any = simtrackdate.add(Number(durationindays), 'days');
                                    body["simtrackdatetime"] = simtrackdate;
                                    body["simtrackdurationindays"] = durationindays;
                                    let simtrackExpiredate = moment(new Date(newsimtrackdate)).format("YYYY-MM-DD HH:mm:ss");

                                    let sim_reg_body = {
                                        deviceType: "SIM",
                                        mobileNumber: mobileno.mobilenos,
                                        consentDurationInDays: durationindays,
                                        consentMessage: microservicesurl.sim_track_consentMessage + "  " + simtrackExpiredate + " - " + body.enterprisename,
                                        device_attributes: {
                                            driverName: body.drivername,
                                            vehicleNumber: body.vehiclenumber
                                        }
                                    }
                                    await deviceUpload(sim_reg_body, loginResult.token).then(async (regResult: any) => {
                                        if (regResult.message) {
                                            await deviceRegister(body).then(async (deviceRes: any) => {
                                                if (deviceRes.status == 200) {
                                                    return resolve(new details(200, SUCCESS_MSG, regResult.message));
                                                }
                                                else {
                                                    return resolve(deviceRes)
                                                }
                                            });
                                        }
                                        else {
                                            return resolve(new APIResponse(400, "Registration failed"));
                                        }
                                    })
                                }
                                else {
                                    return resolve(new APIResponse(400, INVALID_CREDENTIALS_MSG));
                                }

                            });
                        }
                        else {
                            let simtrackdate = moment(new Date());
                            let durationindays: Number = statusres.data[0].durationindays;
                            body["simtrackdatetime"] = simtrackdate;
                            body["simtrackdurationindays"] = durationindays;
                            await deviceRegister(body).then(async (deviceRes: any) => {
                                if (deviceRes.status == 200) {
                                    return resolve(new details(200, SUCCESS_MSG, "Successfully Registered"));
                                }
                                else {
                                    return resolve(deviceRes)
                                }
                            });

                        }

                    }
                    else {
                        return resolve(new APIResponse(400, ALREADY_EXISTS_MSG));
                    }
                }
                else {
                    return resolve(statusres)
                }
            });
        })
    }
    catch (ex) {
        return new APIResponse(500, SOMETHING_WENT_MSG)
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


async function fms_sendconsent(body: any) {
    return new Promise(async (resolve, reject) => {
        let mobileno = [body.drivermobile.toString()];
        let loginbody: any = { username: microservicesurl.sim_track_username, password: microservicesurl.sim_track_password }
        await simtrackLogin(loginbody).then(async (loginResult: any) => {
            if (loginResult.token) {
                console.log("Login Success")
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
        // let options: any = {
        //     url: microservicesurl.seco_api,
        //     method: "POST",
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'x-api-key': microservicesurl.seco_x_api_key
        //     },
        //     httpsAgent: httpsAgent,
        //     body: reqbody,
        //     json: true
        // }

        // request(options, function (err, response, result) {
        //     if (err) {
        //         return resolve(new APIResponse(500, SOMETHING_WENT_MSG))
        //     }
        //     else {
        //         return resolve(new APIResponse(200, "Device registered"));
        //     }
        // });
    }).catch(error => {
        console.log(JSON.stringify(error.message));
        return new APIResponse(500, SOMETHING_WENT_MSG);
    });
}
async function deviceRegister(body: any) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.trips + 'v1/deviceRegister',
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

async function simtrackstatus(drivermobile: any) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.trips + "simtrackstatus",
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


export async function SIMRegistrationUpdate(body: any) {
    try {
        return new Promise(async (resolve, reject) => {
            let mobileno = { mobilenos: [body.drivermobile.toString()] };
            await axios.post(microservicesurl.trips + "simtrackstatus", mobileno).then(async (simresult: any) => {
                if (simresult.data.status == 200) {
                    if (simresult.data.data[0].status != "1") {
                        if (simresult.data.data[0].network_type == 1 && microservicesurl.isfmsenable) {
                            let loginbody = { username: microservicesurl.sim_track_username, password: microservicesurl.sim_track_password }
                            await axios.post(microservicesurl.sim_track_api_url + "/login", loginbody).then(async (loginresult: any) => {
                                if (loginresult.status == 200) {
                                    let token = loginresult.data.token;
                                    let simheader = {
                                        'Content-Type': 'application/json',
                                        'x-access-token': token
                                    }
                                    let sim_unreg_body = {
                                        status: "unregistered"
                                    }

                                await axios.put(microservicesurl.sim_track_api_url + "/devices/" + body.drivermobile, sim_unreg_body, { headers: simheader }).then(async (simregresult: any) => {
                                    if (simregresult.status == 200) {
                                        await axios.post(microservicesurl.trips + 'deviceUnRegister', body).then(async (result: any) => {
                                            return resolve(result.data);
                                        }).catch(error => {
                                            return resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                        })
                                    }
                                    else {
                                        return resolve(new APIResponse(500, "Sim Registration Update failed"));
                                    }

                                }).catch(error => {
                                    return resolve(new APIResponse(500, "Sim Registration Update failed" + error));
                                });

                            }
                            else {
                                return resolve(new APIResponse(400, INVALID_CREDENTIALS_MSG));
                            }

                        }).catch(error => {
                            return resolve(new APIResponse(500, "Sim Registration Update failed"));
                        });
                    }
                    else {
                        await axios.post(microservicesurl.trips + 'deviceUnRegister', body).then(async (result: any) => {
                            return resolve(result.data);
                        }).catch(error => {
                            return resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                        })
                    }

                }
                else {
                    return resolve(new details(200, SUCCESS_MSG, simresult.data.data[0]));
                }


            }
            else {
                return resolve(simresult.data)
            }
            }).catch(err => {
                return resolve(new APIResponse(500, "Sim Registration Update failed"));
            });
        })
    }
    catch (ex) {
        return new APIResponse(500, "Sim Registration Update failed")
    }
}


// export async function getEncryptPassword(password) {
//     return sha256.x2(password);
// }

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
export async function getEncryptPassword(password) {
    return sha256.x2(password);
}

export async function isExitUserLogin(userid) {
    let reqObj = { userid }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.configurationpath + "v1/get-exit-login-user",
            reqObj).then(result => {
                let response = result.data;
                resolve(response)
            }).catch(error => {
                resolve({ status: 500, message: error.message })
                console.log("Error in tokenPushToArray:" + error.message);
            });
    });
}

export async function getUserToken(userid) {
    let reqObj = { userid }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.configurationpath + "v1/get-config-user-token",
            reqObj).then(result => {
                let response = result.data;
                resolve(response)
            }).catch(error => {
                resolve({ status: 500, message: error.message })
                console.log("Error in tokenPushToArray:" + error.message);
            });
    });
}

export async function removeToken(userid, token) {
    // USERS_TOKEN_LIST = USERS_TOKEN_LIST.filter(t => t.refreshToken !== token);
    let reqObj = { userid, token }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.configurationpath + "v1/login-user-remove-token",
            reqObj).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in removeToken:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });
}

export async function removeUserToken(userid, token) {
    // USERS_TOKEN_LIST = USERS_TOKEN_LIST.filter(t => t.refreshToken !== token);
    let reqObj = { userid, token }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.configurationpath + "v1/remove-config-user-token",
            reqObj).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in removeToken:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });
}

export async function getTripsToken(userid) {
    let reqObj = { userid }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.trips + "v1/get-trip-user-token",
            reqObj).then(result => {
                let response = result.data;
                resolve(response)
            }).catch(error => {
                resolve({ status: 500, message: error.message })
                console.log("Error in tokenPushToArray:" + error.message);
            });
    });
}

export async function removeTripsToken(userid, token) {
    // USERS_TOKEN_LIST = USERS_TOKEN_LIST.filter(t => t.refreshToken !== token);
    let reqObj = { userid, token }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.trips + "v1/remove-trip-user-token",
            reqObj).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in removeToken:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });
}

export async function insertTripsToken(userid, tokenDetails, adminemailid) {
    // USERS_TOKEN_LIST.push(token);
    let newUserLogin = {
        userid: userid,
        adminemailid: adminemailid,
        tokendetails: {
            token: tokenDetails.token,
            tokenkey: tokenDetails.tokenkey,
            refreshtoken: tokenDetails.refreshToken,
            refreshtokenkey: tokenDetails.refreshtokenkey,
            expiresin: tokenDetails.expires_in,
        }
    }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.trips + "v1/insert-trip-user-token",
            newUserLogin).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in tokenPushToArray:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });

}


export async function tokenPushToArray(userid, tokenDetails, adminemailid) {
    // USERS_TOKEN_LIST.push(token);
    let newUserLogin = {
        userid: userid,
        adminemailid: adminemailid,
        tokendetails: {
            token: tokenDetails.token,
            tokenkey: tokenDetails.tokenkey,
            refreshtoken: tokenDetails.refreshToken,
            refreshtokenkey: tokenDetails.refreshtokenkey,
            expiresin: tokenDetails.expires_in,
        }
    }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.configurationpath + "v1/login-user-insert-token",
            newUserLogin).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in tokenPushToArray:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });

}

export async function insertUserToken(userid, tokenDetails, adminemailid) {
    // USERS_TOKEN_LIST.push(token);
    let newUserLogin = {
        userid: userid,
        adminemailid: adminemailid,
        tokendetails: {
            token: tokenDetails.token,
            tokenkey: tokenDetails.tokenkey,
            refreshtoken: tokenDetails.refreshToken,
            refreshtokenkey: tokenDetails.refreshtokenkey,
            expiresin: tokenDetails.expires_in,
        }
    }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.configurationpath + "v1/insert-config-user-token",
            newUserLogin).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in tokenPushToArray:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });

}

export async function isExitUserLoginForJHS(userid) {
    let reqObj = { userid }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/get-exit-login-user",
            reqObj).then(result => {
                let response = result.data;
                resolve(response)
            }).catch(error => {
                resolve({ status: 500, message: error.message })
                console.log("Error in isExitUserLoginForJHS:" + error.message);
            });
    });
}

export async function isExitUserLoginForJHS_JMTI(userid) {
    let reqObj = { userid }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/get-exit-login-user_redis",
            reqObj).then(result => {
                let response = result.data;
                resolve(response)
            }).catch(error => {
                resolve({ status: 500, message: error.message })
                console.log("Error in isExitUserLoginForJHS:" + error.message);
            });
    });
}

export async function removeTokenForJHS(userid, token) {
    let reqObj = { userid, token }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/login-user-remove-token",
            reqObj).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in removeTokenForJHS:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });
}

export async function isExitUserLoginForJMTI(userid) {
    let reqObj = { userid }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/get-exit-login-jmtiuser",
            reqObj).then(result => {
                let response = result.data;
                resolve(response)
            }).catch(error => {
                resolve({ status: 500, message: error.message })
                console.log("Error in isExitUserLoginForJMTI:" + error.message);
            });
    });
}

//4.9 feature
export async function isExitUserLoginForJMTINew(userid) {
    let reqObj = { userid : userid}
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v2/get-exit-login-jmtiuser",
            reqObj).then(result => {
                let response = result.data;               
                resolve(response)
            }).catch(error => {
                resolve({ status: 500, message: error.message })
                console.log("Error in isExitUserLoginForJMTI:" + error.message);
            });
    });
}

export async function isExitUserLoginForJMTIRedis(userid) {
    console.log("Entered in to isExitUserLoginForJMTIRedis()")
    let reqObj = { userid : userid}
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v2/get-exit-login-user_redis",
            reqObj).then(result => {
                console.log("Result  data for isExitUserLoginForJMTIRedis()" + JSON.stringify(result.data));
                let response = result.data;               
                resolve(response)
            }).catch(error => {
                resolve({ status: 500, message: error.message })
                console.log("Error in isExitUserLoginForJMTIRedis:" + error.message);
            });
    });
}



//4.9 feature
export async function isExitUserLoginForJMToken(userid) {
    let reqObj = { userid: userid}
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/get-exit-login-jmuser",
            reqObj).then(result => {
                let response = result.data;
                resolve({status:200, data:response})
            }).catch(error => {
                resolve({ status: 500, message: error.message })
                console.log("Error in isExitUserLoginForJMTI:" + error.message);
            });
    });
}
export async function removeTokenForJMTI(userid, token) {
    let reqObj = { userid, token }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/login-user-remove-jmtitoken",
            reqObj).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in removeTokenForJMTI:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });
}

//4.9 feature
export async function removeTokenForJMTINew(userid, token) {
    let reqObj = { userid, token }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v2/login-user-remove-jmtitoken",
            reqObj).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in removeTokenForJMTI:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });
}
//4.9 feature
export async function removeTokenForJM(userid, token) {
    let reqObj = { userid, token }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/login-user-remove-jmtoken",
            reqObj).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in removeTokenForJMTI:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });
}
export async function tokenPushToArrayForJHS(userid, tokenDetails, adminemailid) {
    // USERS_TOKEN_LIST.push(token);
    let newUserLogin = {
        userid: userid,
        adminemailid: adminemailid,
        tokendetails: {
            token: tokenDetails.token,
            tokenkey: tokenDetails.tokenkey,
            refreshtoken: tokenDetails.refreshToken,
            refreshtokenkey: tokenDetails.refreshtokenkey,
            expiresin: tokenDetails.expires_in,
        }
    }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/login-user-insert-token",
            newUserLogin).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in tokenPushToArrayForJHS:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });

}

export async function tokenPushToArrayForJHS_JMTI(userid, tokenDetails, adminemailid) {
    // USERS_TOKEN_LIST.push(token);
    console.log("Entered in to tokenPushToArrayForJHS_JMTI()")
    let newUserLogin = {
        userid: userid,
        adminemailid: adminemailid,
        tokens: [{
            token: tokenDetails.token,
            tokenkey: tokenDetails.tokenkey,
            refreshtoken: tokenDetails.refreshToken,
            refreshtokenkey: tokenDetails.refreshtokenkey,
            expiresin: tokenDetails.expires_in,
        }]
    }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/login-user-insert-token_redis",
            newUserLogin).then(result => {
                console.log("Result for tokenPushToArrayForJHS_JMTI():" + JSON.stringify(result.data))
                resolve(result.data);
            }).catch(error => {
                console.log("Error in tokenPushToArrayForJHS:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });

}

export async function tokenPushToArrayForJMTI(userid, tokenDetails, adminemailid) {
    // USERS_TOKEN_LIST.push(token);
    console.log("Token details are tokenDetails():" + JSON.stringify(tokenDetails))
    let newUserLogin = {
        userid: userid,
        adminemailid: adminemailid,
        tokendetails: {
            // jmtitoken: tokenDetails.data.data.api_key,
            // jmtiexpiresin : tokenDetails.data.data.expires_on
            jmtitoken: tokenDetails.access_token,
            jmtiexpiresin : tokenDetails.access_token_expires_in
        }
    }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/login-user-insert-jmtitoken",
            newUserLogin).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in tokenPushToArrayForJMTI:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });

}
//4.9 feature
export async function tokenPushToArrayForJMTINew(userid, tokenDetails, adminemailid) {
    
    let newUserLogin = {
        userid: userid,
        adminemailid: adminemailid,
        tokendetails: tokenDetails
    }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v2/login-user-insert-jmtitoken",
            newUserLogin).then(result => {                
                resolve(result.data);
            }).catch(error => {
                console.log("Error in tokenPushToArrayForJMTINew:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });

}

export async function tokenPushToArrayForJMTIRedis(username, tokenDetails, adminemailid,userid) {
    console.log("Enterted in to tokenPushToArrayForJMTIRedis");
    let newUserLogin = {
        userid: userid,
        username : username,
        adminemailid: adminemailid,
        tokens:[{
            access_token : tokenDetails.access_token,
            access_token_expires_in : tokenDetails.access_token_expires_in,
            refresh_token : tokenDetails.refresh_token,
            refresh_token_expires_in : tokenDetails.refresh_token_expires_in,
            enterpriseName : tokenDetails.enterpriseName,
            account_Secret : tokenDetails.account_Secret
        }]
        //tokendetails: tokenDetails
    }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v2/login-user-insert-token",
            newUserLogin).then(result => {  
                console.log("Result for tokenPushToArrayForJMTIRedis:" + JSON.stringify(result.data));              
                resolve(result.data);
            }).catch(error => {
                console.log("Error in tokenPushToArrayForJMTIRedis:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });

}


//4.9 feature
export async function tokenPushToArrayForJMToken(userid, tokenDetails, adminemailid) {        
        let newUserLogin = {
        userid: userid,
        adminemailid: adminemailid,
        tokendetails: {
            access_token: tokenDetails.access_token,
            refresh_token : tokenDetails.refresh_token,
            expires_in: tokenDetails.expires_in
        }
    }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "v1/login-user-insert-jmtoken",
            newUserLogin).then(result => {                
                resolve(result.data);
            }).catch(error => {
                console.log("Error in tokenPushToArrayForJM token:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });
}

export async function removeJMTITokenRedis(userid) {
    let reqObj = { userid }
    return new Promise(async (resolve, reject) => {
        await axios.post(microservicesurl.jca_url + "login-user-remove-token_jmti_redis",
            reqObj).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log("Error in removeToken:" + error.message);
                resolve({ status: 500, message: error.message })
            });
    });
}

export async function SIMRegistration_V2(body: any) {
    try {
        return new Promise(async (resolve, reject) => {
            await simtrackstatus(body.drivermobile).then(async (statusres: any) => {
                console.log("SimTrackStatus result is: " + JSON.stringify(statusres));
                if (statusres.status == 200) {
                    //if (statusres.data[0].status === "1") {
                    let simtrackdate = moment(new Date());
                    let durationindays: Number = statusres.data[0].durationindays;
                    let newsimtrackdate: any = simtrackdate.add(Number(durationindays), 'days');
                    body["simtrackdatetime"] = simtrackdate;
                    body["simtrackdurationindays"] = durationindays;
                    body["simtrackexpiredate"] = moment(new Date(newsimtrackdate)).format("YYYY-MM-DD HH:mm:ss");
                    body["durationindays"] = durationindays;
                    body["network_type"] = "2";
                    body["carrier"] = "Non Jio";
                    console.log("isfmsenable value is: " + microservicesurl.isfmsenable);
                    if (microservicesurl.isfmsenable) {
                        await fms_sendconsent_v1(body).then(async (fms_consent_res: any) => {
                            console.log("fms_sendconsent_v1 result is: " + JSON.stringify(fms_consent_res));
                            if (fms_consent_res.status == 200 || fms_consent_res.status == 201) {
                                if (fms_consent_res.networkType) {
                                    body.network_type = fms_consent_res?.networkType.toUpperCase() == "JIO" ? 1 : 0;
                                    body.carrier = fms_consent_res?.networkType.toUpperCase() == "JIO" ? "Jio" : "Non Jio";
                                }

                                if (fms_consent_res.status == 201 && fms_consent_res.consent_status?.toLowerCase() == "consent_approved") {
                                    body.simtrackstatus = "3"
                                }
                                else if (fms_consent_res.status == 201 && fms_consent_res.consent_status?.toLowerCase() == "approved") {
                                    body.simtrackstatus = "4"
                                }
                                else {
                                    body.simtrackstatus = "2"
                                }


                                await deviceRegister(body).then(async (deviceRes: any) => {
                                    console.log("deviceRegister result is: " + JSON.stringify(deviceRes));
                                    if (deviceRes.status == 200) {
                                        let msg = fms_consent_res.status == 200 ? "Device registered" : "Mobile number already registered for tracking, Consent message will not be sent to the receipiant and valid till " + fms_consent_res.expiry_time;
                                        let consentValidity = fms_consent_res?.expiry_time ? fms_consent_res?.expiry_time : ""
                                        resolve(new APIResponseForConsentNew(fms_consent_res.status, msg, consentValidity));
                                    }
                                    else {
                                        resolve(deviceRes);
                                    }
                                }).catch(ex => {
                                    console.log("Exception in deviceRegister() :  " + ex.message);
                                    resolve(new APIResponseForConsent(500, SOMETHING_WENT_MSG));
                                });
                            }
                            else {
                                resolve(fms_consent_res)
                            }
                        }).catch(ex => {
                            console.log("Exception in fms_sendconsent_v1() :  " + ex.message);
                            resolve(new APIResponseForConsent(500, SOMETHING_WENT_MSG));
                        });
                    }
                    else {
                        resolve(new APIResponseForConsent(400, BAD_REQ));
                    }

                    // }
                    // else {
                    //     resolve(new APIResponse(400, ALREADY_EXISTS_MSG));
                    // }
                }
                else {
                    resolve(statusres)
                }
            }).catch(error => {
                console.log("Exception in simtrackstatus() :  " + error.message);
                resolve(new APIResponseForConsent(500, SOMETHING_WENT_MSG));
            });
        })
    }
    catch (ex) {
        return new APIResponse(500, SOMETHING_WENT_MSG)
    }
}

async function fms_sendconsent_v1(body: any) {
    return new Promise(async (resolve, reject) => {
        let loginbody: any = { username: microservicesurl.sim_track_username, password: microservicesurl.sim_track_password }
        await simtrackLogin(loginbody).then(async (loginResult: any) => {
            if (loginResult?.token) {

                let mobileno = body.drivermobile ? body.drivermobile.toString() : "";
                let sim_reg_body = {
                    mobileNumber: [mobileno],
                    consentDurationInDays: body.durationindays
                }

                await devicestatus(mobileno, loginResult.token).then(async (deviceresult: any) => {
                    console.log("deviceStatus result is: " + JSON.stringify(deviceresult));
                    if (deviceresult.status == 200) {
                        resolve({ status: 201, networkType: deviceresult.networkType, expiry_time: deviceresult.expiry_time, consent_status: deviceresult.consent_status });
                    }
                    else if (deviceresult.status == 404 || deviceresult.status == 405) {
                        await deviceConsent(sim_reg_body, loginResult.token).then(async (regResult: any) => {
                            console.log("deviceConsent result is: " + JSON.stringify(regResult));
                            if ((deviceresult.status == 405 && deviceresult.networkType.toUpperCase() != "JIO") || regResult.status == 202) {
                                regResult.status = 201;
                                regResult.networkType = deviceresult.networkType;
                            }
                            else if (regResult.status == 200 && !regResult?.networkType) {
                                regResult.networkType = deviceresult.networkType;
                            }

                            if (deviceresult.status == 405) {
                                regResult.expiry_time = deviceresult.expiry_time
                            }

                            resolve(regResult);
                        }).catch(ex => {
                            console.log("Exception in fms_sendconsent_v1() deviceConsent  : " + ex.message);
                            resolve(new APIResponseForConsent(500, SOMETHING_WENT_MSG))
                        });
                    }
                    else {
                        resolve(deviceresult);
                    }
                }).catch(ex => {
                    console.log("Exception in fms_sendconsent_v1() devicestatus() : " + ex.message);
                    resolve(new APIResponseForConsent(500, SOMETHING_WENT_MSG));
                });
            }
            else {
                resolve(new APIResponseForConsent(400, INVALID_CREDENTIALS_MSG));
            }
        }).catch(ex => {
            console.log("Exception in fms_sendconsent_v1 simtrackLogin() : " + ex.message);
            resolve(new APIResponseForConsent(500, SOMETHING_WENT_MSG));
        });
    }).catch(ex => {
        console.log("Exception in fms_sendconsent_v1 promise method : " + ex.messsage)
        return new APIResponseForConsent(500, SOMETHING_WENT_MSG)
    });

}

export async function devicestatus(mobileNumber, token) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.sim_track_api_url + "/v1/devices/" + mobileNumber,
                method: "GET",
                headers: {
                    "content-type": "application/json",
                    'x-access-token': token
                },
                json: true
            }

            if (microservicesurl.fms_proxy.isenable) {
                options["proxy"] = microservicesurl.fms_proxy.protocol_type + "://" + microservicesurl.fms_proxy.host + ":" + microservicesurl.fms_proxy.port
            } else if (microservicesurl.fms_proxy.add_proxy_key_false) {
                options["proxy"] = false;
            }

            request(options, function (err, response, result) {
                if (err) {
                    console.log("Error in devicestatus() request || " + err.message)
                    resolve(new APIResponseForConsent(500, SOMETHING_WENT_MSG))
                }
                else if (result?.error?.toLowerCase().includes("failed to authenticate")) {
                    resolve(new APIResponseForConsent(401, result?.error))
                }
                else if (result?.consentStatus) {
                    if (microservicesurl.unregistered_consent_status.includes(result?.consentStatus)) {
                        resolve(new LOCResponse(405, "Success", result?.networkType, result?.consentExpiresOn, result?.consentStatus));
                    }
                    else {
                        resolve(new LOCResponse(200, "Success", result?.networkType, result?.consentExpiresOn, result?.consentStatus));
                    }
                }
                else if (result?.error?.toLowerCase().includes("not registered")) {
                    resolve(new APIResponseForConsent(404, result?.error))
                }
                else if (result?.error) {
                    resolve(new APIResponseForConsent(400, result?.error))
                }
                else {
                    console.log("device status : " + JSON.stringify(result))
                    resolve(new APIResponseForConsent(400, NO_DATA_AVL_MSG))
                }
            });
        }).catch(ex => {
            console.log("Exception in devicestatus Promise() " + ex.message)
            return new APIResponseForConsent(500, SOMETHING_WENT_MSG)
        });
    }
    catch (ex) {
        console.log("Exception in devicestatus() " + ex.message)
        return new APIResponseForConsent(500, SOMETHING_WENT_MSG)
    }
}

async function deviceConsent(body: any, token) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.sim_track_api_url + "/v1/devices/consent",
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

            request(options, function (err, response, result) {
                if (err) {
                    console.log("Error in deviceConsent() request || " + err.message)
                    resolve(new APIResponseForConsent(500, SOMETHING_WENT_MSG))
                }
                else if (result?.error) {
                    resolve(new APIResponseForConsent(400, result.error))
                }
                else if (result?.message?.toLowerCase() === "device already registered") {
                    resolve(new LOCResponse(202, "Success", "", "", "device_register"))
                }
                else if (result?.message?.toLowerCase() === "device registered") {
                    resolve(new LOCResponse(200, "Success", result?.networkType, "", "device_register"))
                }
                else {
                    resolve(new APIResponseForConsent(400, SOMETHING_WENT_MSG))
                }
            });
        }).catch(ex => {
            console.log("Exception in deviceConsent Promise() " + ex.message)
            return new APIResponseForConsent(500, SOMETHING_WENT_MSG)
        });
    }
    catch (ex) {
        console.log("Exception in deviceConsent() " + ex.message)
        return new APIResponseForConsent(500, SOMETHING_WENT_MSG)
    }
}


export async function simactiveinactive_withlatlangs(drivermobile: string) {
    return new Promise(async (resolve, reject) => {
        let loginbody: any = { username: microservicesurl.sim_track_username, password: microservicesurl.sim_track_password }
        await simtrackLogin(loginbody).then(async (loginResult: any) => {
            if (loginResult.token) {
                await devicestatus(drivermobile, loginResult.token).then(async (deviceresult: any) => {
                    try {
                        let body = {
                            drivermobile: drivermobile
                        }
                        if (deviceresult.status == 200) {
                            if (deviceresult?.consent_status?.toLowerCase() == "consent_approved") {
                                await simActivate(body, loginResult.token).then(async (regResult: any) => {
                                    if (regResult.status == 200) {
                                        body["simtrackstatus"] = "4";
                                        await simActivateandDeactivate(body).then(async (deviceRes: any) => {
                                            //resolve(deviceRes);
                                            await devicestatuswithlatlang(drivermobile, loginResult.token).then(async (deviceresult: any) => {
                                                resolve(deviceresult);
                                            }).catch(ex => {
                                                console.log("Exception in simactiveinactive=> devicestatuswithlatlang || " + ex.message)
                                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                            });
                                        }).catch(ex => {
                                            console.log("Exception in deviceRegister() :  " + ex.message);
                                            resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                        });

                                    } else {
                                        resolve(new APIResponse(400, "Unable to Activate"));
                                    }
                                }).catch(ex => {
                                    console.log("Exception in simActivate call || " + ex.message)
                                    resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                                })
                            }
                            else if (deviceresult?.consent_status?.toLowerCase() == "approved") {
                                resolve({ status: 200, data: deviceresult });

                            }
                            else {
                                resolve(new APIResponse(400, NO_DATA_AVL_MSG));
                            }

                        }
                        else if (deviceresult.status == 405 || deviceresult.status == 404) {
                            body["simtrackstatus"] = "1";
                            await simActivateandDeactivate(body).then(async (deviceRes: any) => {
                                resolve({ status: 200, message: "Device in cancelled state, Please resend the consent" });
                            }).catch(ex => {
                                console.log("Exception in deviceRegister() :  " + ex.message);
                                resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                            });
                        }
                        else {
                            resolve(new APIResponse(400, NO_DATA_AVL_MSG));
                        }
                    }
                    catch (ex) {
                        console.log("Exception in simactiveinactive=> devicestatus inner || " + ex.message)
                        resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                    }
                }).catch(ex => {
                    console.log("Exception in simactiveinactive=> devicestatus || " + ex.message)
                    resolve(new APIResponse(500, SOMETHING_WENT_MSG));
                });

            }
        }).catch(ex => {
            console.log("Exception in simactiveinactive=> simtrackLogin || " + ex.message)
            resolve(new APIResponse(500, SOMETHING_WENT_MSG));
        });
    }).catch(ex => {
        console.log("Exception in simactiveinactive=> promise() || " + ex.message)
        return (new APIResponse(500, SOMETHING_WENT_MSG));
    });
}

async function devicestatuswithlatlang(mobileNumber, token) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.sim_track_api_url + "/v1/devices/" + mobileNumber,
                method: "GET",
                headers: {
                    "content-type": "application/json",
                    'x-access-token': token
                },
                json: true
            }

            if (microservicesurl.fms_proxy.isenable) {
                options["proxy"] = microservicesurl.fms_proxy.protocol_type + "://" + microservicesurl.fms_proxy.host + ":" + microservicesurl.fms_proxy.port
            } else if (microservicesurl.fms_proxy.add_proxy_key_false) {
                options["proxy"] = false;
            }

            request(options, function (err, response, result) {
                if (err) {
                    console.log("Error in devicestatuswithlatlang() request || " + err.message)
                    resolve(new APIResponse(500, SOMETHING_WENT_MSG))
                }
                else if (result?.error?.toLowerCase().includes("failed to authenticate")) {
                    resolve(new APIResponse(401, result?.error))
                }
                else if (result?.consentStatus) {
                    if (microservicesurl.unregistered_consent_status.includes(result?.consentStatus)) {
                        resolve(new LOCResponseWithLatLangs(405, "Success", result?.networkType, result?.consentExpiresOn, result?.consentStatus, "", ""));
                    }
                    else {
                        console.log("devicestatuswithlatlang response is  || " + JSON.stringify(result))
                        resolve(new LOCResponseWithLatLangs(200, "Success", result?.networkType, result?.consentExpiresOn, result?.consentStatus, result?.locationInfo?.lat, result?.locationInfo?.long));
                    }
                }
                else if (result?.error?.toLowerCase().includes("not registered")) {
                    resolve(new APIResponse(404, result?.error))
                }
                else if (result?.error) {
                    resolve(new APIResponse(400, result?.error))
                }
                else {
                    console.log("device status : " + JSON.stringify(result))
                    resolve(new APIResponse(400, NO_DATA_AVL_MSG))
                }
            });
        }).catch(ex => {
            console.log("Exception in devicestatuswithlatlang Promise() " + ex.message)
            return new APIResponse(500, SOMETHING_WENT_MSG)
        });
    }
    catch (ex) {
        console.log("Exception in devicestatuswithlatlang() " + ex.message)
        return new APIResponse(500, SOMETHING_WENT_MSG)
    }
}

async function simActivateandDeactivate(body: any) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.usermanagementpath + '/simactivateanddeactivate',
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: body,
                json: true
            }

            request(options, async function (err, response, body) {
                if (err) {
                    console.log("Error in simActivateandDeactivate() " + err)
                    resolve(new APIResponse(500, SOMETHING_WENT_MSG))
                }
                else if (response.statusCode == 200) {
                    resolve(body);
                }
                else {
                    resolve(new APIResponse(500, SOMETHING_WENT_MSG))
                }
            });
        }).catch(ex => {
            console.log("Exception in simActivateandDeactivate() Promise Method" + ex.message)
            return new APIResponse(500, SOMETHING_WENT_MSG)
        });
    }
    catch (ex) {
        console.log("Exception in simActivateandDeactivate() " + ex.message)
        return new APIResponse(500, SOMETHING_WENT_MSG);
    }
}

async function simActivate(body, token: any) {
    return new Promise(async (resolve, reject) => {

        let options: any = {
            url: microservicesurl.sim_track_api_url + "/v1/devices/activate-tracking",
            method: "PUT",
            headers: {
                "content-type": "application/json",
                'x-access-token': token
            },
            body: { "mobileNumber": Number(body.drivermobile) },
            json: true
        }


        if (microservicesurl.fms_proxy.isenable) {
            options["proxy"] = microservicesurl.fms_proxy.protocol_type + "://" + microservicesurl.fms_proxy.host + ":" + microservicesurl.fms_proxy.port
        } else if (microservicesurl.fms_proxy.add_proxy_key_false) {
            options["proxy"] = false;
        }


        request(options, function (err, response, result) {
            if (err) {
                console.log("Error in simActivate() " + err)
                resolve(new APIResponse(500, SOMETHING_WENT_MSG))
            }
            else if (result?.message?.toLowerCase() == "device is already active." || result?.message?.toLowerCase() == "activation successful") {
                resolve(new APIResponse(200, result.message));
            }
            else {
                resolve(new APIResponse(400, "Activation failed"));
            }
        });
    }).catch(ex => {
        console.log("Exception in simActivate || " + ex.message);
        return new APIResponse(500, SOMETHING_WENT_MSG);
    });
}

export async function getConsentSIM(drivermobile: any) {
    try {
        return new Promise(async (resolve, reject) => {
            let options: any = {
                url: microservicesurl.trips + 'v2/GetConsentForSIM',
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: { mobilenos: drivermobile },
                json: true
            }

            if (microservicesurl.fms_proxy.isenable) {
                options["proxy"] = microservicesurl.fms_proxy.protocol_type + "://" + microservicesurl.fms_proxy.host + ":" + microservicesurl.fms_proxy.port
            } else if (microservicesurl.fms_proxy.add_proxy_key_false) {
                options["proxy"] = false;
            }

            request(options, function (err, response, body) {
                if (err) {
                    console.log("Error in getConsentSIM() " + err)
                    return resolve(new APIResponse(500, SOMETHING_WENT_MSG))
                }
                else {
                    return resolve(body);
                }
            });
        }).catch(error => {
            console.log("Error in getConsentSIM promise method() " + error.message)
            return new APIResponse(500, SOMETHING_WENT_MSG);
        });
    }
    catch (ex) {
        console.log("Exception in getConsentSIM() " + ex)
        return new APIResponse(500, SOMETHING_WENT_MSG)
    }
}

export const addDeviceinJMTI = async function (jmti_url, jmti_api_key, data) {
    // let adddeviceurl: any = jmti_url + "/enterprises/devices/v1/add";
        console.log("adddeviceinJMTI :- Add Device JMTI URL " + jmti_url);
        console.log("adddeviceinJMTI :- JMTI APIKey " + jmti_api_key);
        console.log("adddeviceinJMTI :- Add Device Request " + JSON.stringify(data));

        const body = JSON.parse(JSON.stringify(data));
        const config = {
            method: 'post',
            url:jmti_url,
            headers: {
                'Content-Type': 'application/json',
                'ApiKey': jmti_api_key
            },
            data: body
        };
    
        try {
            console.log("JMTI Request For Axios Method :-" + JSON.stringify(config));
            const response = await axiosRequest(config);
            if (response && response.data) {
                console.log("JMTI Final Response :-" + response.data);
                return Promise.resolve(response.data);
            }
            return Promise.resolve(response.data);
    
        } catch (error) {
            console.log("JMTI Error response is" + error.message)
            if (error.response && error.response.data) {
    
                /** check if invalid names error */
                let errordata = error.response.data;
    
                const errorResp = {
                    errorResponse: {
                        invalid_name: [],
                        not_found: [],
                        out_of_range: []
                    }
                }
    
                if (errordata.data && errordata.data.status && errordata.data.status == 'failure') {
                    errorResp.errorResponse.invalid_name = errordata.data.failures[0].error_details.invalid_name;
                    errorResp.errorResponse.not_found = errordata.data.failures[0].error_details.not_found;
                    errorResp.errorResponse.out_of_range = errordata.data.failures[0].error_details.out_of_range;
    
                    return Promise.resolve(errorResp);
                } else if (errordata.errorResponse && errordata.errorResponse.length) {
    
                    errorResp.errorResponse.invalid_name = errordata.errorResponse[0].error_details.invalid_name;
                    errorResp.errorResponse.not_found = errordata.errorResponse[0].error_details.not_found;
                    errorResp.errorResponse.out_of_range = errordata.errorResponse[0].error_details.out_of_range;
    
                    return Promise.resolve(errorResp);
                }
            } else {
                console.log("JMTI Error response in else block" + error.message)
                return Promise.reject(error.response.data);
            }
        }
}


