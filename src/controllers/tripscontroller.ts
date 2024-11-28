import Router from 'express';
import axios from 'axios'
import { microservicesurl } from './../utils/config';
import { APIError, APIResponse, SHARETRIPResponse, apitokenResponse, details, tokenResponse } from './../utils/status';
import { generateToken } from './../utils/JWTToken';
import { getEncryptPassword } from './../utils/common';
import { SUCCESS_MSG, SOMETHING_WENT_MSG, MANDATORY_ERROR_MSG, CLIENT_ID, TRIP_CATEGORY, USER_ID, CREATED_BY, NO_DATA_AVL_MSG, UNAUTH_MSG, CANCEL_TRIP_STATUS, INVALID_REQ_MSG, UPDATE_INVALID_REQ_MSG, INVALID_ORIGIN_LATLONG, INVALID_DEST_LATLONG, INVALID_TOUCH_LATLONG, INVALID_DATETIME, INVALID_VEHICLE_REGNO, INVALID_DRIVER_NAME, INVALID_DRIVER_MNO,INVALID_CREDENTIALS_MSG, INVALID_VEHICLE_TYPE, INVALID_ORIGIN, INVALID_DEST, INVALID_TOUCH, INVALID_ROUTE, ORIGIN_DESTINATION_SAME_ERR, mobileMsg, INVALID_SECONDARY_MNO,INVALID_ADDITIONAL_DRIVER_MNO, ADDITIONAL_DRIVER_MSG, bookingIdErrMsg, ADMIN_ERR, SOMETHINGMSG, tripIdErrMsg, Invalid_autostarttrip_Msg, Invalid_autoendtrip_Msg, SOMETHING_WENT_ERR_MSG, DRIVER_MNO_MSG } from '../utils/errormsg';
import { getConsentSIM,simtrackLogin,devicestatus, getTripsToken, insertTripsToken, removeTripsToken, simactiveinactive_withlatlangs, SIMRegistration_V1, SIMRegistration_V2, validateJsonData } from './common';
import { brotliCompressSync } from 'zlib';
import moment from 'moment';
const isValidCoordinates = require('is-valid-coordinates')
var router = Router()
let body;
const { performance } = require("perf_hooks")
var fs1 = require("fs");
var config = fs1.readFileSync("./thirdpartyconfig.json");
let config_details = JSON.parse(config);
const globalSettingsId = config_details?.fr_settings_id ? config_details.fr_settings_id : "";
/** This method is used to get Asset access token */
router.post("/v1/gettoken", async (req, res) => {
    try {
        body = req.body;
        let token;
        let expires_in;
        if (!body.username) {
            res.send(new tokenResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.password) {
            res.send(new tokenResponse(202, MANDATORY_ERROR_MSG))
        }
        else {
            let encryptedpwd = await getEncryptPassword(body.password)
            let jsonbody = { username: body.username, password: encryptedpwd }
            await axios.post(microservicesurl.trips + 'v1/user-validate', jsonbody).then(async result => {
                if (result.data) {
                    let loginResonse: any = result.data;
                    if (loginResonse.status == 201) {

                        let userToken: any = await getTripsToken(loginResonse.userid);

                        if (userToken.status == 200) {
                            let expiresEpoch = Number(userToken.data.tokens[0].expiresin);
                            let currentEpoch = Date.now();

                            if ((expiresEpoch > currentEpoch) && userToken.data.tokens[0].tokenkey != "") {
                                token = userToken.data.tokens[0].tokenkey;
                                expires_in = Number(userToken.data.tokens[0].expiresin)
                            } else {
                                await removeTripsToken(loginResonse.userid, userToken.data.tokens[0].token);
                                let genTokenResp = await generateToken(loginResonse.userid);
                                await insertTripsToken(loginResonse.userid, genTokenResp, body.username);
                                token = genTokenResp.tokenkey;
                                expires_in = Number(genTokenResp.expires_in)
                            }
                        } else {
                            let genTokenResp = await generateToken(loginResonse.userid);
                            //console.log(genTokenResp)
                            await insertTripsToken(loginResonse.userid, genTokenResp, body.username);
                            token = genTokenResp.tokenkey;
                            expires_in = Number(genTokenResp.expires_in)
                        }

                    }
                    // let loginResonse: any = result.data;
                    // let loginToken: any = ''
                    // if (loginResonse.status == 201) {
                    //     loginToken = await generateToken(loginResonse.clientid);
                    // }
                    // let reponseObj: any = new tokenResponse(Number(loginResonse.status), loginToken.token ? SUCCESS_MSG : NO_DATA_AVL_MSG);
                    // reponseObj.token = loginToken.token ? loginToken.token : '';
                    // reponseObj.customerid = loginResonse.customerid ? loginResonse.customerid : ''
                    res.send(new tokenResponse(loginResonse.status, loginResonse.message, token, loginResonse.userid, loginResonse.clientid, expires_in));
                }
            }).catch(error => {
                res.send(new tokenResponse(205, SOMETHING_WENT_MSG, '', ''));
            });
        }

    } catch (error) {
        res.send(new tokenResponse(205, SOMETHING_WENT_MSG, '', ''));
    }
});

/** This method is used to call create trip API */
router.post('/v1/createtrip', async (req, res) => {
    try {
        body = req.body;
        if (!body.category) {  // category
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (validCategory(body)) {  // category
            res.send(new APIResponse(202, INVALID_REQ_MSG))
        }
        else if (!body.customerid) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        else if (!body.vehicle.regno) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.vehicle.type) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (validVehicleTypes(body)) { // vehicle.type 
            res.send(new APIResponse(202, INVALID_REQ_MSG))
        }
        else if (!body.driver.name && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.driver.mobile && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.guest.name && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.guest.mobile && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.origin.lat) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.origin.lon) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.origin.address) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.destination.lat) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.destination.lon) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.destination.address) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.pickup.lat && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.pickup.lon && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.pickup.address && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.drop.lat && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.drop.lon && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.drop.address && body.category == "1") {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        // else if (!body.load.capacity && body.category == "2") { // required for cargo trips only
        //     res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        // }
        // else if (!body.load.material && body.category == "2") { // required for cargo trips only
        //     res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        // }
        else if (!body.trip.autostarttrip) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.trip.autoendtrip) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.trip.type) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.trip.datetime) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (validTypeAndStatus(body)) {
            res.send(new APIResponse(202, INVALID_REQ_MSG))
        }
        else {
            await axios.post(microservicesurl.trips + 'v1/create-trip', body).then(result => {
                res.send(result.data);
            }).catch(error => {
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            });

        }
    } catch (error) {
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})

function validCategory(body) {
    let status = true;
    if (body.category == "1" || body.category == "2") {
        status = false
    }
    return status;
}

function validTypeAndStatus(body) {
    let status = true;
    if (body.category == "1") { // for guest
        if (Number(body.trip.type) <= 5 && Number(body.trip.type) >= 1) {
            status = false;
        }
    }
    else if (body.category == "2") { // for cargo
        if (Number(body.trip.type) <= 9 && Number(body.trip.type) >= 6) {
            status = false;
        }
    }
    return status
}

function validVehicleTypes(body) {
    let status = false;
    try {
        if (Number(body.vehicle.type) > 20 && Number(body.vehicle.type) < 44) {
            status = true;
        }
    } catch (ex) {
        ex = null;
    }
    return status;
}

/** This method is used to call update trip API */
router.post('/v1/updatetrip', async (req, res) => {
    try {
        body = req.body;
        if (!body.tripid) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        else if (!body.tripstatus) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        else if (validTripStatusInUpdate(body)) {
            res.send(new APIResponse(202, UPDATE_INVALID_REQ_MSG))
        }
        else {
            await axios.post(microservicesurl.trips + 'v1/update-trip', body).then(result => {
                res.send(result.data);
            }).catch(error => {
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            });

        }
    } catch (error) {
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})

function validTripStatusInUpdate(body) {
    let status = true;
    if (Number(body.tripstatus) <= 6 && Number(body.tripstatus) >= 2 || Number(body.tripstatus) <= 58 && Number(body.tripstatus) >= 52) {
        status = false;
    }
    return status;
}


/** This method is used to call update trip API */
router.post('/v1/canceltrip', async (req, res) => {
    try {
        body = req.body;
        if (!body.tripid) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        else if (!body.tripstatus) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (body.tripstatus != "6" && body.tripstatus != "58") {
            res.send(new APIResponse(202, CANCEL_TRIP_STATUS))
        }
        else {
            await axios.post(microservicesurl.trips + 'v1/cancel-trip', body).then(result => {
                res.send(result.data);
            }).catch(error => {
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            });

        }
    } catch (error) {
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})



/** This method is used to get Asset access token */
router.post("/v2/gettoken", async (req, res) => {
    try {
        body = req.body;
        let token;
        let expires_in;
        if (!body.username) {
            res.send(new tokenResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.password) {
            res.send(new tokenResponse(202, MANDATORY_ERROR_MSG))
        }
        else {
            let encryptedpwd = await getEncryptPassword(body.password)
            let jsonbody = { username: body.username, password: encryptedpwd }
            await axios.post(microservicesurl.trips + 'v1/user-validate', jsonbody).then(async result => {
                if (result.data) {
                    let loginResonse: any = result.data;
                    if (loginResonse.status == 201) {

                        let userToken: any = await getTripsToken(loginResonse.userid);

                        if (userToken.status == 200) {
                            let expiresEpoch = Number(userToken.data.tokens[0].expiresin);
                            let currentEpoch = Date.now();

                            if ((expiresEpoch > currentEpoch) && userToken.data.tokens[0].tokenkey != "") {
                                token = userToken.data.tokens[0].tokenkey;
                                expires_in = Number(userToken.data.tokens[0].expiresin)
                            } else {
                                await removeTripsToken(loginResonse.userid, userToken.data.tokens[0].token);
                                let genTokenResp = await generateToken(loginResonse.userid);
                                await insertTripsToken(loginResonse.userid, genTokenResp, loginResonse.adminName);
                                token = genTokenResp.tokenkey;
                                expires_in = Number(genTokenResp.expires_in)
                            }
                        } else {
                            let genTokenResp = await generateToken(loginResonse.userid);
                            //console.log(genTokenResp)
                            await insertTripsToken(loginResonse.userid, genTokenResp, loginResonse.adminName);
                            token = genTokenResp.tokenkey;
                            expires_in = Number(genTokenResp.expires_in)
                        }

                    }
                    // let loginResonse: any = result.data;
                    // let loginToken: any = ''
                    // if (loginResonse.status == 201) {
                    //     loginToken = await generateToken(loginResonse.clientid);
                    // }
                    // let reponseObj: any = new tokenResponse(Number(loginResonse.status), loginToken.token ? SUCCESS_MSG : NO_DATA_AVL_MSG);
                    // reponseObj.token = loginToken.token ? loginToken.token : '';
                    // reponseObj.customerid = loginResonse.customerid ? loginResonse.customerid : ''
                    res.send(new tokenResponse(loginResonse.status, loginResonse.message, token, loginResonse.customerid, loginResonse.userid, expires_in));
                }
            }).catch(error => {
                console.log(error + "Line no : 333");
                res.send(new tokenResponse(205, SOMETHING_WENT_MSG, '', ''));
            });
        }

    } catch (error) {
        console.log(error + "Line no : 339");
        res.send(new tokenResponse(205, SOMETHING_WENT_MSG, '', ''));
    }
});

/** This method is used to call create trip API */
router.post('/v2/createtrip', async (req, res) => {
    try {
        body = req.body;
        if (!body.clientkey) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.vehicle.regno) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidVehRegno(body.vehicle.regno)) {
            res.send(new APIResponse(202, INVALID_VEHICLE_REGNO))
        }
        else if (!body.vehicle.type) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!validVehicleTypes(body)) { //need to change the code for validating the veh type
            res.send(new APIResponse(202, INVALID_VEHICLE_TYPE))
        }
        else if (!body.driver.name) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverName(body.driver.name)) {
            res.send(new APIResponse(202, INVALID_DRIVER_NAME))
        }
        else if (!body.driver.mobile) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverMNO(body.driver.mobile)) {
            res.send(new APIResponse(202, INVALID_DRIVER_MNO))
        }
        else if (!body.origin.lat) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.origin.lon) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidCoordinates(parseFloat(body.origin.lat), parseFloat(body.origin.lon))) {
            res.send(new APIResponse(202, INVALID_ORIGIN_LATLONG))
        }
        else if (!body.destination.lat) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.destination.lon) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidCoordinates(parseFloat(body.destination.lat), parseFloat(body.destination.lon))) {
            res.send(new APIResponse(202, INVALID_DEST_LATLONG))
        }
        else if (!body.trip.autostarttrip) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.trip.autoendtrip) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.trip.datetime) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDatetime(body.trip.datetime)) {
            res.send(new APIResponse(206, INVALID_DATETIME))
        }
        else {
            body.touchpoints = body.touchpoints ? body.touchpoints : [];
            if (body.touchpoints.length > 0) {


                for (let i = 0; i < body.touchpoints.length; i++) {
                    const tch = body.touchpoints[i];
                    if (!tch.seqno) {
                        res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
                        break;
                    }
                    else if (!tch.lat) {
                        res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
                        break;
                    }
                    else if (!tch.lon) {
                        res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
                        break;
                    }
                    else if (!isValidCoordinates(parseFloat(tch.lat), parseFloat(tch.lon))) {
                        res.send(new APIResponse(202, INVALID_TOUCH_LATLONG))
                        break;
                    }
                }

                try {
                    body.touchpoints = body.touchpoints.sort(function (a, b) {
                        var x = a['seqno']; var y = b['seqno'];
                        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                    });
                } catch (e) {
                    e = null;
                }
            }

            await axios.post(microservicesurl.trips + 'v2/create-trip', body).then(async result => {
                res.send(result.data);

                if (result.data.status == 201 && body.trip.getdriverconsent == "True") {

                    await axios.post(microservicesurl.trips + 'getClientVehdata_DrConcent', body).then(async result => {

                        if (result.status == 200) {
                            result.data.data['driverMno'] = body.driver.mobile;
                            result.data.data['driverName'] = body.driver.name;
                            await doSIMRegistration(result.data.data);
                        }
                    }).catch(error => {
                        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
                    });
                }
            }).catch(error => {
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            });

        }
    } catch (error) {
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})

function isValidDatetime(date) {

    let status = true;
    var givenDate = new Date(date);
    var currentDate = new Date();

    if (givenDate.getTime() < currentDate.getTime()) {
        status = false;
    }
    return status;

}
/**This method is uesd for validate the date format */
function isValidDatetimeEpoch(date: any, body: any) {
    try {
        let status = true;
        var givenDate: any = new Date(date);
        var currentDate: any = new Date();
        let diff_date: any = currentDate.getTime() + 120000;
        let sub_date: any = currentDate.getTime() - 120000;
        let given_epoch_date: any = givenDate.getTime();
        if (givenDate.getTime() < currentDate.getTime()) {
            if ((sub_date <= given_epoch_date) && (given_epoch_date < diff_date)) {
                body.scheduletype = 1;
            } else {
                status = false;
            }
        } else {
            body.scheduletype = 2;
        }
        return status;
    } catch (error) {
        console.log("ERROR in catch .. " + error.message);
    }

}
function isValidVehRegno(regno) {
    let status = true;

    if (body.vehicle.regno) {
        let regNo: string = body.vehicle.regno;
        try {
            if (!regNo.match(/^[a-zA-Z][a-zA-Z0-9 ]+$/) ||
                !regNo.match(/^[a-zA-Z0-9 ]+$/) || regNo.match(/\s+/g)) {
                status = false;
            }
            else if (regNo.startsWith("0") || regNo.startsWith("1") || regNo.startsWith("2")
                || regNo.startsWith("3") || regNo.startsWith("4") || regNo.startsWith("5")
                || regNo.startsWith("6") || regNo.startsWith("7") || regNo.startsWith("8")
                || regNo.startsWith("9")
            ) {
                status = false;
            }
            else if (regNo.includes(" ")) {
                status = false;
            }
            else if (!(regNo.length >= 3 && regNo.length <= 30)) {
                status = false;
            }
        } catch (e) {
            e = null;
            status = false;
        }

    }
    return status;
}

function isValidDriverName(driverName) {
    let status = true;
    try {
        let nameregx = /^[a-zA-Z ]+$/;
        if (!nameregx.test(driverName)) {
            status = false;
        }
        else if (!(driverName.length >= 3 && driverName.length <= 30)) {
            status = false;
        }

    } catch (e) {
        e = null;
        status = false;
    }
    return status;
}

function isValidDriverMNO(mnostr) {
    let status = true;

    try {

        if (mnostr.length >= 10) {
            let MOBILE_USER_REGX = /^[0]?[56789]\d{9}$/
            if (!String(mnostr).match(MOBILE_USER_REGX)) {
                status = false;
            }
        }
        else {
            status = false;
        }
    } catch (e) {
        e = null;
        status = false;
    }

    return status;
}

async function doSIMRegistration(body) {
    return new Promise(async (resolve, reject) => {

        let reqObj = {
            drivermobile: body.driverMno ? body.driverMno : "",
            drivername: body.driverName ? body.driverName : "",
            simtrackstatus: 2,///2
            vehiclenumber: body.regNo ? body.regNo : "",
            simtracktype: 'N',///'N'
            enterprisename: body.enterpriseName ? body.enterpriseName : "",/// 'RCP'--- based on clientkey
            driverid: "",//optional
            clientid: body.clientId ? body.clientId : "",///11
            vehicletagname: body.tagName ? body.tagName : "",
            adminid: body.adminId ? body.adminId : ""//// unique id
        }
        let simRes: any = await SIMRegistration_V2(reqObj);

        resolve({
            "status": simRes.status == 200 ? 201 : (simRes.status == 400 ? 203 : simRes.status),
            "message": simRes.status == 200 ? 'Consent Successfully sent to driver' : (simRes.status == 400 ? 'Consent is already sent' : simRes.message),
            "driver": {
                "name": body.driverName,
                "mobile": body.driverMno,
                "ts": new Date()
            },
            "consentValidity": simRes?.consentValidity ? simRes?.consentValidity : "" 
        });
    });
}

/** This method is used to send the consent to driver */
router.post('/v1/sendsimtrackconsent', async (req, res) => {
    try {
        body = req.body;
        if (!body.driver.name) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverName(body.driver.name)) {
            res.send(new APIResponse(202, INVALID_DRIVER_NAME))
        }
        else if (!body.driver.mobile) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverMNO(body.driver.mobile)) {
            res.send(new APIResponse(202, INVALID_DRIVER_MNO))
        }
        else {
            await axios.post(microservicesurl.trips + 'getClientVehdata_DrConcent', body).then(async result => {

                if (result.status == 200) {
                    result.data.data['driverMno'] = body.driver.mobile;
                    result.data.data['driverName'] = body.driver.name;
                    let obj = await doSIMRegistration(result.data.data);
                    res.send(obj);
                } else {
                    res.send(result.data);
                }
            }).catch(error => {
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            });

        }
    } catch (error) {
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})


/** This method is used to call update trip API */
router.post('/v2/updatetrip', async (req, res) => {
    try {
        body = req.body;
        if (!body.tripid) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        else if (!body.tripstatus) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        // else if (!body.tpseqno) {
        //     res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        // }
        else if (!validTripStatusInUpdate1(body.tripstatus, body.tpseqno)) {
            res.send(new APIResponse(202, UPDATE_INVALID_REQ_MSG))
        }
        else {

            if (body.tpseqno == null || body.tpseqno == '') {
                await axios.post(microservicesurl.trips + 'v2/update-trip', body).then(result => {
                    res.send(result.data);

                    axios.post(microservicesurl.trips + 'v1/status-update-cargo-trips', body).then(result => {

                    });

                }).catch(error => {
                    res.send(new APIResponse(205, SOMETHING_WENT_MSG))
                });
            } else {
                try {
                    body.index = Number(body.tpseqno) - 1;
                    await axios.post(microservicesurl.trips + 'v1/update-touchpoint-status', body).then(result => {
                        res.send(result.data);
                    });
                } catch (e) {
                    e = null;
                    res.send(new APIResponse(205, SOMETHING_WENT_MSG))
                }
            }
        }
    } catch (error) {
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})

function validTripStatusInUpdate1(tripstatus, tpseqno) {
    let status = false;
    let sts = (tpseqno != undefined && tpseqno != '' && tpseqno != null) ? ['97'] : ['54', '57', '58'];

    if (sts.includes(tripstatus)) {
        status = true;
    }
    return status;
}

/** This method is used to call update trip API */
router.post('/v2/canceltrip', async (req, res) => {
    try {
        body = req.body;
        if (!body.tripid) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        else if (!body.tripstatus) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (body.tripstatus != "58") {
            res.send(new APIResponse(202, CANCEL_TRIP_STATUS))
        }
        else {
            await axios.post(microservicesurl.trips + 'v2/update-trip', body).then(result => {
                res.send(result.data);
            }).catch(error => {
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            });

        }
    } catch (error) {
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})


/** Custom trip API methods start */

/** This method is used to call create trip API */
router.post('/v3/createtrip', async (req, res) => {
    try {
        body = req.body;
        let time = performance.now();
        body.adminemailid = req.headers.adminemailid;
        body.createdby = req.headers.tokenuserid;
        let alphanumericwithoutspace = new RegExp('^[a-zA-Z0-9]+$');
        let validateRequest: any = await validateJsonData(body);
        if (validateRequest.status == 200) {
            if(body?.trip && !body?.trip?.datetime)
            {
                let currentDateTime = new Date();
                let currentTime = currentDateTime.getHours()+":"+currentDateTime.getMinutes()+":"+currentDateTime.getSeconds();
                let currentDate = currentDateTime.toISOString().split('T')[0];
                body.trip.datetime = currentDate+ " " + currentTime
            }
            if (!body.clientkey) {
                res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
            }
            else if (!body.vehicle?.regno) {
                res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
            }            
            else if (body?.vehicle.regno && (body?.vehicle.regno.length < 4 || body?.vehicle.regno.length > 12)) {
                res.send(new APIResponse(202, "Vehicle RegNo should be greater than 4 (or) less than or equal to 12 characters"));
                return false;
            }
            else if (body?.vehicle.regno && !body?.vehicle.regno.match(alphanumericwithoutspace)) {
                res.send(new APIResponse(202, "Invalid vehicle regno"));
                return;
            }            
            else if (!body.trip?.autostarttrip) {
                res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
            }
            else if (!body.trip?.autoendtrip) {
                res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
            }
            else if(body?.trip?.autostarttrip && (body?.trip?.autostarttrip.toUpperCase()!="TRUE" &&  body?.trip?.autostarttrip.toUpperCase()!="FALSE" )){
                res.send(new APIResponse(202, Invalid_autostarttrip_Msg));
                return;
            }
            else if(body?.trip?.autoendtrip && (body?.trip?.autoendtrip.toUpperCase()!="TRUE" && body?.trip?.autoendtrip.toUpperCase()!="FALSE") ){
                res.send(new APIResponse(202, Invalid_autoendtrip_Msg));
                return;
            }  
            /** This method is used for trip now and scheduled later */
            else if (!isValidDatetimeEpoch(body.trip?.datetime, body)) {
                res.send(new APIResponse(206, INVALID_DATETIME))
            }
            else {
                if (!body.portabletracker || body.portabletracker == "" || Object.keys(body.portabletracker).length == 0) {
                    body.portabletracker = { "enabled": "False", "deviceid": "" }
                }
                if (body.portabletracker?.enabled && body.portabletracker.enabled == "True" && (!body.portabletracker?.deviceid && !body.portabletracker?.imei)) {
                    res.send(new APIResponse(202, 'IMEI or Device id is required for portable tracker'));
                    return false;
                }
                else if (body.portabletracker?.enabled && body.portabletracker.enabled == "True" && body.portabletracker?.deviceid && body.portabletracker?.deviceid.length > 24) {
                    res.send(new APIResponse(202, 'Invalid device id'));
                    return false;
                }
                if(body.portabletracker?.enabled && body.portabletracker.enabled == "True" && body.portabletracker?.imei && body.portabletracker?.imei.length > 16)
                {
                    res.send(new APIResponse(202, 'Invalid IMEI number'));
                    return false;
                }
                if (!body.vehicle?.type) {
                    body.vehicle.type = '21';
                } else if (body.vehicle?.type) {
                    if (!validVehicleTypes(body)) {
                        res.send(new APIResponse(202, INVALID_VEHICLE_TYPE));
                        return false;
                    }
                }                
                //latlongs
                if (!body.origin?.latitude && !body.origin?.longitude && !body.origin?.code) {
                    if (!body.route?.code && !body.route?.name) {
                        res.send(new APIResponse(202, INVALID_ROUTE));
                        return false;
                    }
                }
                else if (!body.route?.code) {
                    if (body.origin && !validateAddress_proper(body.origin)) {
                        res.send(new APIResponse(202, INVALID_ORIGIN));
                        return false;
                    }

                    if (body.destination && !validateAddress_proper(body.destination)) {
                        res.send(new APIResponse(202, INVALID_DEST));
                        return false;
                    }
                }

                if (body.origin?.invoices && body.origin?.invoices.length > 0) {
                    if (!checkInvoiceformat(body.origin.invoices)) {
                        res.send(new APIResponse(202, 'Origin == > Invalid Invoices'));
                        return false;
                    }
                }

                if (body.destination?.invoices && body.destination?.invoices.length > 0) {
                    if (!checkInvoiceformat(body.destination.invoices)) {
                        res.send(new APIResponse(202, 'Destination == > Invalid Invoices'));
                        return false;
                    }
                }

                body.touchpoints = body.touchpoints ? body.touchpoints : [];                
                if (!body.hasOwnProperty('subbusinessid')) {
                    body.subbusinessid = "";
                }
                if (!body.hasOwnProperty('businessid')) {
                    body.businessid = "";
                }                
                if (!body.transporter) {
                    body.transporter = {};
                }
                if (body.hasOwnProperty('transporter') && !body.transporter.hasOwnProperty("name")) {
                    body.transporter.name = "";
                } if (body.hasOwnProperty('transporter') && !body.transporter.hasOwnProperty("code")) {
                    body.transporter.code = "";
                }
                if (!body.route) {
                    body.route = {};
                }
                if (body.hasOwnProperty('route') && !body.route.hasOwnProperty("name")) {
                    body.route.name = "";
                }
                if (body.hasOwnProperty('route') && !body.route.hasOwnProperty("code")) {
                    body.route.code = "";
                }
                if (!body.route?.code && body.hasOwnProperty('origin') && !body.origin.hasOwnProperty("materials")) {
                    body.origin.materials = [];
                }
                if (!body.route?.code && body.hasOwnProperty('origin') && !body.origin.hasOwnProperty("invoices")) {
                    body.origin.invoices = [];
                }
                if (!body.route?.code && body.hasOwnProperty('destination') && !body.destination.hasOwnProperty("materials")) {
                    body.destination.materials = [];
                }
                if (!body.route?.code && body.hasOwnProperty('destination') && !body.destination.hasOwnProperty("invoices")) {
                    body.destination.invoices = [];
                }
                if (!body.route?.code && body.hasOwnProperty('destination') && !body.destination.hasOwnProperty("EWB")) {
                    body.destination.EWB = [];
                }
                if (!body.hasOwnProperty('touchpoints')) {
                    body.touchpoints = [];
                }
                if (!body.hasOwnProperty('docs')) {
                    body.docs = {};
                }
                if (!body.docs.hasOwnProperty("lrnumber")) {
                    body.docs.lrnumber = "";
                }
                if (!body.trip.hasOwnProperty("referenceid")) {
                    body.trip.referenceid = "";
                }
                if (!body.trip.hasOwnProperty("duration")) {
                    body.trip.duration = "";
                }
                if (!body.trip.hasOwnProperty("distance")) {
                    body.trip.distance = "";
                }
                if (!body.trip.hasOwnProperty("schedulereturntrip")) {
                    body.trip.schedulereturntrip = "0";
                }
                if (!body.trip.hasOwnProperty("custom_field")) {
                    body.trip.custom_field = [];
                }
                if (!body.hasOwnProperty("additionaldrivers")) {
                    body.additionaldrivers = [];
                }
                else if(body.additionaldrivers && body.additionaldrivers.length > 1)
                {
                    res.send(new APIResponse(202, "One additional driver should be allowed in a trip"));
                    return false;

                }
                if (!body.hasOwnProperty("hasfr") || !body.hasfr) {
                    body.hasfr = false;
                } else {
                    body.hasfr = body.hasfr == "True" ? true : false;
                     body.settingID=globalSettingsId;
                }
                if (!body.hasOwnProperty("hasapptracking") || !body.hasapptracking) {
                    body.hasaptr = false;
                } else {
                    body.hasaptr = body.hasapptracking == "True" ? true : false;
                }
                
                if (body.touchpoints.length > 0) {


                    for (let i = 0; i < body.touchpoints.length; i++) {
                        const tch = body.touchpoints[i];
                        if (!tch.seqno) {
                            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
                            return false;
                        }
                        else if (tch.invoices && tch.invoices.length > 0) {
                            if (!checkInvoiceformat(tch.invoices)) {
                                res.send(new APIResponse(202, 'Touchpoint ' + (i + 1) + ' == > Invalid Invoices'));
                                return false;
                            }
                        }
                    }

                    try {
                        body.touchpoints = body.touchpoints.sort(function (a, b) {
                            var x = a['seqno']; var y = b['seqno'];
                            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                        });
                    } catch (e) {
                        e = null;
                    }
                }
                
                if (!body.trip?.schedulereturntrip) {
                    body.trip.schedulereturntrip = "0";
                }

                body.trip.trackingsource = "1";
                let marketDriver = false;                
                let onBoardDetails:any = await checkVehicleOnboardDetails(body) 
                if(onBoardDetails?.status == 200)
                {
                    if(onBoardDetails.data.Status == 400)
                    {
                        body.marketvehicle = "True"
                        if (!body.driver?.mobile) {
                            res.send(new APIResponse(202, DRIVER_MNO_MSG))
                            return;
                        }
                        else if (!isValidDriverMNO(body.driver.mobile)) {
                            res.send(new APIResponse(202, INVALID_DRIVER_MNO))
                            return;
                        }
                        else{
                            if (!body.driver?.name) {
                                body.driver.name = "Driver_" + body.driver?.mobile ? body.driver?.mobile : "" 
                            } else if (body?.driver?.name) {
                                if (!isValidDriverName(body.driver.name)) {
                                    res.send(new APIResponse(202, INVALID_DRIVER_NAME));
                                    return false;
                                }
                            }
                        }
                        let onboardDriverDetails: any = await checkDriverOnboardDetails(body)
                        if(onboardDriverDetails?.status == 200)
                        {
                            if(onboardDriverDetails.data.Status == 400)
                            {
                                marketDriver = true; 
                            }
                            else if(onboardDriverDetails.data.Status == 200)
                            {                                    
                                marketDriver = false;  
                            }                            
                            else {
                                res.send(new APIResponse(202, onboardDriverDetails.data.Msg));
                                return false;
                            }
                        }else{
                            res.send(new APIResponse(202, SOMETHING_WENT_MSG));
                            return false;
                        } 
                    }
                    else if(onBoardDetails.data.Status == 200){
                        body.marketvehicle = "False"  
                        if(onBoardDetails.data?.DeviceName && onBoardDetails.data?.DeviceName?.toUpperCase() == "PORTABLE" )
                        {
                            body.portabletracker.assigned = true;
                            body.portabletracker.enabled = "True";
                            body.portabletracker.deviceid = onBoardDetails.data?.Device_ID ?  onBoardDetails.data?.Device_ID  : ""
                            body.portabletracker.devicetype = onBoardDetails.data?.DeviceType ? onBoardDetails.data?.DeviceType : ""
                            body.portabletracker.imei = onBoardDetails.data?.IMEI ? onBoardDetails.data?.IMEI : ""  
                            body.portabletracker.brand = onBoardDetails.data?.DeviceVendor ? onBoardDetails.data?.DeviceVendor : ""                                                     
                        }
                        else if(body.portabletracker.enabled == "True"){
                            body.portabletracker.assigned = false;
                        }
                        if(onBoardDetails.data?.DeviceName && onBoardDetails.data?.DeviceName?.toUpperCase() != "NO TRACKER")
                        {
                            body.trip.trackingsource = "2";
                        }
                        //Check driver assigned to the vehicle or not
                        if(onBoardDetails.data?.DriverMobileNumber){
                            body.driver = {mobile: onBoardDetails.data?.DriverMobileNumber,
                                name: onBoardDetails.data?.DriverName ? onBoardDetails.data?.DriverName : "Driver_"+ onBoardDetails.data?.DriverMobileNumber
                            }
                        }
                        else{
                            if (!body.driver?.mobile) {
                                res.send(new APIResponse(202, DRIVER_MNO_MSG))
                                return;
                            }
                            else if (!isValidDriverMNO(body.driver.mobile)) {
                                res.send(new APIResponse(202, INVALID_DRIVER_MNO))
                                return;
                            } 
                            else{
                                if (!body.driver?.name) {
                                    body.driver.name = "Driver_" + body.driver?.mobile ? body.driver?.mobile : "" 
                                } else if (body?.driver?.name) {
                                    if (!isValidDriverName(body.driver.name)) {
                                        res.send(new APIResponse(202, INVALID_DRIVER_NAME));
                                        return false;
                                    }
                                }
                            }  
                        }                        
                    }
                    else {
                        res.send(new APIResponse(202, onBoardDetails.data.Msg));
                        return false;
                    }
                }
                else{
                    res.send(new APIResponse(202, SOMETHING_WENT_MSG));
                    return false;
                }

                if (body.hasOwnProperty('driver') && !body.driver.hasOwnProperty("alternate_mobile")) {
                    body.driver.alternate_mobile = "";
                }
                //Active driver functionality

                //By default primary driver should be active
                if(body.additionaldrivers.length > 0)
                {                    
                    for (let i = 0; i < body.additionaldrivers.length; i++){
                        if(!body.additionaldrivers[i]?.hasOwnProperty('mno'))
                        {
                            res.send(new APIResponse(202, ADDITIONAL_DRIVER_MSG));
                            return false;
                        }
                        else if (!isValidDriverMNO(body.additionaldrivers[i].mno)) {
                            res.send(new APIResponse(202, INVALID_ADDITIONAL_DRIVER_MNO))
                            return false;
                        }
                    }                    
                }
                if(!body.driver.hasOwnProperty('active'))
                {
                    if(body.additionaldrivers.length > 0)
                    {
                        for (let i = 0; i < body.additionaldrivers.length; i++){
                            if(body.additionaldrivers[i].hasOwnProperty('active') && body.additionaldrivers[i].active)
                            {
                                body.driver.active = false;
                                break;
                            }
                            else{
                                body.driver.active = true;
                            }
                        }
                    }
                    else{
                        body.driver.active = true;
                    }                    
                }
                else  if(!body.driver.active){                   
                    if(body.additionaldrivers.length > 0)
                    {
                        for (let i = 0; i < body.additionaldrivers.length; i++){
                            if(body.additionaldrivers[i].hasOwnProperty('active') && body.additionaldrivers[i].active)
                            {
                                body.driver.active = false;
                                break;
                            }
                            else{
                                body.driver.active = true;
                            }
                        }
                    }
                    else{
                        body.driver.active = true;
                        if(body.additionaldrivers.length > 0)
                        {
                            for (let i = 0; i < body.additionaldrivers.length; i++){
                                body.additionaldrivers[i].active = false;
                            }
                        }
                    }  
                }
                else{
                    if(body.additionaldrivers.length > 0)
                    {
                        for (let i = 0; i < body.additionaldrivers.length; i++){
                            body.additionaldrivers[i].active = false;
                        }
                    }
                    body.driver.active = true
                }
             
                if (body.marketvehicle == "True") {
                    let veh_obj: any = { "regno": body.vehicle.regno }
                    time = performance.now();
                    let onboard_mvo: any = await addMarketVehicleOnboard(veh_obj);

                    console.log(`v3/createtrip addMarketVehicleOnboard(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);


                    if (onboard_mvo.status == 200 || onboard_mvo.status == 204) {
                        let driver_obj: any = { "mno": body.driver.mobile }

                        time = performance.now();
                        if(marketDriver){
                            body.driver.dtype = "1";
                            let driver_res: any = await addMarketDriverOnboard(driver_obj);
                            
                            console.log(`v3/createtrip addMarketDriverOnboard(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);


                            if (driver_res.status == 200 || driver_res.status == 204) {
                            } else {
                                res.send(new APIResponse(202, driver_res.message ? driver_res.message : SOMETHING_WENT_MSG));
                                return false;
                            }
                        } 
                    } else {
                        res.send(new APIResponse(202, onboard_mvo.message ? onboard_mvo.message : SOMETHING_WENT_MSG));
                        return false;
                    }
                }
                else {
                    body.marketvehicle = "False"
                }

                //Additional driver functionality
                if(body.additionaldrivers.length > 0)
                {                     
                    let request = {clientkey: body.clientkey, loginid: req.headers.tokenuserid, adminemailid: body.adminemailid, searchText : body.additionaldrivers[0].mno}            
                    let onBoardDetails:any = await checkAddntlDriverOnboardDetails(request)   
                    {
                        if(onBoardDetails.status == 400)
                        {
                            res.send(new APIResponse(202, onBoardDetails.message));
                            return false;                            
                        }
                        else if(onBoardDetails.status == 201){

                            let driver_obj: any = { "mno": body.additionaldrivers[0].mno }
                            time = performance.now();
                            body.additionaldrivers[0].dtype = "1";
                            let driver_res: any = await addMarketDriverOnboard(driver_obj);
                            
                            console.log(`v3/createtrip addMarketDriverOnboard(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);


                            if (driver_res.status == 200 || driver_res.status == 204) {
                            } else {
                                res.send(new APIResponse(202, driver_res.message ? driver_res.message : SOMETHING_WENT_MSG));
                                return false;
                            }                            
                        }else if(onBoardDetails.status != 200)
                        {
                            res.send(new APIResponse(202, onBoardDetails.message));
                            return false;
                        }
                    } 
                }
                
                /** SIM track status checking only for (sim vehicles + create trip now) ====> START */
                let driverStatusRes: any;
                let deviceRes: any = new Object();
                let consent = body.driver?.driverconsent ? body.driver?.driverconsent : true
                if (!consent) {
                    body.active = false
                }
                if (Number(body.scheduletype) == 1) {

                    time = performance.now();
                    if(body.driver?.driverconsent)
                    {
                        body.trip.getdriverconsent = "True";
                        driverStatusRes = await getSimDriverlivestatus({ "drivermobile": body.driver.mobile });
                        console.log(`v3/createtrip getSimDriverlivestatus(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                        console.log("driverStatusRes  .. " + JSON.stringify(driverStatusRes));
                        if (driverStatusRes.status == 200) {
                            deviceRes = driverStatusRes.data;
                            console.log("deviceRes  .. " + JSON.stringify(deviceRes));

                            if (driverStatusRes.data.sts == "1") {
                                body['driverMno'] = body.driver?.mobile;
                                body['driverName'] = body.driver?.name;
                                body['regNo'] = body.vehicle?.regno;
                                body['adminId'] = body.adminid;
                                time = performance.now();
                                doSIMRegistration(body);

                                console.log(`v3/createtrip doSIMRegistration(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                            } else if (driverStatusRes.data.sts == "3") {

                                time = performance.now();
                                let device_res: any = await simactiveinactive_withlatlangs(body.driver.mobile);

                                console.log(`v3/createtrip doSIMRegistration(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                                console.log("device_res  .. " + JSON.stringify(device_res));
                                if (device_res.status && device_res.status == 200) {
                                    deviceRes.sts = device_res.lat ? "4" : "3",
                                        deviceRes.lat = device_res.lat ? device_res.lat : "",
                                        deviceRes.lng = device_res.lng ? device_res.lng : ""
                                }
                            }
                            body['driversimsts'] = deviceRes;
                            console.log("For market vehicle body  .. " + JSON.stringify(deviceRes));
                        }
                    }

                    if(body.additionaldrivers.length > 0){
                        for (let i=0; i<= body.additionaldrivers.length; i++)
                        {
                            if(body.additionaldrivers[i]?.driverconsent)                                
                            {
                                body.trip.getdriverconsent = "True";
                                driverStatusRes = await getSimDriverlivestatus({ "drivermobile": body.additionaldrivers[i].mno });
                                console.log(`v3/createtrip getSimDriverlivestatus(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                                console.log("driverStatusRes  .. " + JSON.stringify(driverStatusRes));
                                if (driverStatusRes.status == 200) {
                                    deviceRes = driverStatusRes.data;
                                    console.log("deviceRes  .. " + JSON.stringify(deviceRes));

                                    if (driverStatusRes.data.sts == "1") {
                                        body['driverMno'] = body.additionaldrivers[i]?.mno;
                                        body['driverName'] = body.additionaldrivers[i]?.name;
                                        body['regNo'] = body.vehicle?.regno;
                                        body['adminId'] = body.adminid;
                                        time = performance.now();
                                        doSIMRegistration(body);
                                        console.log(`v3/createtrip doSIMRegistration(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                                    } else if (driverStatusRes.data.sts == "3") {

                                        time = performance.now();
                                        let device_res: any = await simactiveinactive_withlatlangs(body.additionaldrivers[i].mno);

                                        console.log(`v3/createtrip doSIMRegistration(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                                        console.log("device_res  .. " + JSON.stringify(device_res));
                                        if (device_res.status && device_res.status == 200) {
                                            deviceRes.sts = device_res.lat ? "4" : "3",
                                                deviceRes.lat = device_res.lat ? device_res.lat : "",
                                                deviceRes.lng = device_res.lng ? device_res.lng : ""
                                        }
                                    }
                                    body['driversimsts'] = deviceRes;
                                    console.log("For market vehicle body  .. " + JSON.stringify(deviceRes));
                                    break;
                                }
                            }                                
                        }
                    }                                                          
                }
                /** SIM track status checking only for (sim vehicles + create trip now) ====>END */

                time = performance.now();

                await axios.post(microservicesurl.trips + 'v3/createtrip', body).then(async result => {

                    console.log(`v3/createtrip MicroService Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);


                    let response = result.data;
                    res.send(result.data);

                    if (response.status == 201) {
                        if (Number(body.scheduletype) == 2) {
                            if(body.driver?.driverconsent)
                            {
                                body['driverMno'] = body.driver?.mobile;
                                body['driverName'] = body.driver?.name;
                                body['regNo'] = body.vehicle?.regno;
                                body['adminId'] = body.adminemailid;
                                doSIMRegistration(body);
                            }
                            if (body?.additionaldrivers.length > 0) {
                                for (let i = 0; i < body.additionaldrivers.length; i++) {
                                    let objDriver = body.additionaldrivers[i]; 
                                    if(objDriver.driverconsent)
                                    {                                       
                                        let reqObj = {
                                            drivermobile: objDriver?.mno ? objDriver.mno : "",
                                            drivername: objDriver?.name ? objDriver.name : "",
                                            simtrackstatus: 2,///2
                                            vehiclenumber: body?.vehicle?.regno ? body.vehicle.regno : "",
                                            simtracktype: 'N',///'N'
                                            enterprisename: body?.enterpriseName ? body.enterpriseName : "",/// 'RCP'--- based on clientkey
                                            driverid: "",//optional
                                            clientid: body?.clientId ? body.clientId : "",///11
                                            vehicletagname: body?.tagName ? body.tagName : "",
                                            adminid: body?.adminId ? body.adminId : ""//// unique id
                                        }
                                        let simRes = await SIMRegistration_V2(reqObj); 
                                    }                                       
                                }
                            }                            
                        }
                    }
                }).catch(error => {
                    console.log("ERROR in inner catch .. " + error.message);
                    res.send(new APIResponse(205, SOMETHING_WENT_MSG))
                });
            }
        } else {
            res.send(validateRequest);
            return
        }

    } catch (error) {
        console.log("ERROR in final catch .. " + error.message);
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})
/** This method is used for add market vehicle onboard */
function addMarketVehicleOnboard(body: any) {
    return new Promise(async (resolve, reject) => {
        try {
            await axios.post(microservicesurl.marketVehicle_CAM_url + '/v1/addMarketVehicle', body).then(async result => {
                resolve(result.data)
            }).catch(error => {
                console.log("Error in inner catch addMarketVehicleOnboard() method ,Error is : " + error.message);
                resolve({ status: 205, msg: SOMETHING_WENT_MSG });
            })
        }
        catch (err) {
            console.log("Error in final catch addMarketVehicleOnboard method ,Error is : " + err.message);
            resolve({ status: 205, msg: SOMETHING_WENT_MSG });
        }
    });
}
/** This method is used for add market vehicle onboard */
function addMarketDriverOnboard(body: any) {
    return new Promise(async (resolve, reject) => {
        try {
            await axios.post(microservicesurl.marketVehicle_CAM_url + '/v1/addMarketDriver', body).then(async result => {
                resolve(result.data)
            }).catch(error => {
                console.log("Error in inner catch addMarketDriverOnboard() method ,Error is : " + error.message);
                resolve({ status: 205, msg: SOMETHING_WENT_MSG });
            })
        }
        catch (err) {
            console.log("Error in final catch addMarketDriverOnboard method ,Error is : " + err.message);
            resolve({ status: 205, msg: SOMETHING_WENT_MSG });
        }
    });
}
/** This method is used for get the driver sim status api */
function getSimDriverlivestatus(body: any) {
    return new Promise(async (resolve, reject) => {
        try {
            await axios.post(microservicesurl.trips + 'v1/getsimdriverlivestatus', body).then(async result => {
                resolve(result.data)
            }).catch(error => {
                console.log("Error in inner catch getSimDriverlivestatus method ,Error is : " + error.message);
                resolve({ status: 205, msg: SOMETHING_WENT_MSG });
            })
        }
        catch (err) {
            console.log("Error in final catch getsimdriverlivestatus method ,Error is : " + err.message);
            resolve({ status: 205, msg: SOMETHING_WENT_MSG });
        }
    });
}

/** This method is used for get the vehicle onboard details*/
function checkVehicleOnboardDetails(body: any) {
    return new Promise(async (resolve, reject) => {
        try {
            await axios.post(microservicesurl.trips + 'v1/checkvehicledetails', body).then(async result => {
                resolve(result.data)
            }).catch(error => {
                console.log("Error in inner catch checkVehicleOnboardDetails method ,Error is : " + error.message);
                resolve({ status: 205, msg: SOMETHING_WENT_MSG });
            })
        }
        catch (err) {
            console.log("Error in final catch checkVehicleOnboardDetails method ,Error is : " + err.message);
            resolve({ status: 205, msg: SOMETHING_WENT_MSG });
        }
    });
}

/** This method is used for get the driver onboard details*/
function checkDriverOnboardDetails(body: any) {
    return new Promise(async (resolve, reject) => {
        try {
            await axios.post(microservicesurl.trips + 'v1/checkdriverdetails', body).then(async result => {
                resolve(result.data)
            }).catch(error => {
                console.log("Error in inner catch checkDriverOnboardDetails method ,Error is : " + error.message);
                resolve({ status: 205, msg: SOMETHING_WENT_MSG });
            })
        }
        catch (err) {
            console.log("Error in final catch checkDriverOnboardDetails method ,Error is : " + err.message);
            resolve({ status: 205, msg: SOMETHING_WENT_MSG });
        }
    });
}

/** This method is used for get the additional driver onboard details*/
function checkAddntlDriverOnboardDetails(body: any) {
    return new Promise(async (resolve, reject) => {
        try {
            await axios.post(microservicesurl.trips + 'v1/availableDriverslist', body).then(async result => {
                resolve(result.data)
            }).catch(error => {
                console.log("Error in inner catch checkAddntlDriverOnboardDetails method ,Error is : " + error.message);
                resolve({ status: 205, msg: SOMETHING_WENT_MSG });
            })
        }
        catch (err) {
            console.log("Error in final catch checkAddntlDriverOnboardDetails method ,Error is : " + err.message);
            resolve({ status: 205, msg: SOMETHING_WENT_MSG });
        }
    });
}

function checkInvoiceformat(invoices) {
    for (let index = 0; index < invoices.length; index++) {
        const element = invoices[index];
        if (!element?.number) {
            return false;
        }
    }
    return true;
}

function validateAddress_proper(obj) {

    let sts: boolean = false;
    /**
            * here obj menas source or destination or touchpoint
            * if user provides obj latlong, ignore code, address
            * if user not given name of obj, take address from latlong and keep that
            * if user not provide obj latlongs, he has to give code or address
    */
    if (obj.latitude && obj.longitude) {
        if (!isValidCoordinates(parseFloat(obj.latitude), parseFloat(obj.longitude))) {
            sts = false;
        } else {
            /// get address based on latlongs
            sts = true;
        }
    } else if (obj.code) {
        /// get origin latlong, name and address from location table
        sts = true;
    } else {
        sts = false;
    }

    return sts;
}



/** This method is used to call update trip API */
router.post('/v3/modifytrip', async (req, res) => {
    try {
        let time = performance.now();
        body = req.body;
        if (!body.trip?.id) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        body.adminid = req.headers.adminemailid
        let reqbody = {
            adminemailid: req.headers.adminemailid,
            bookingid: body.trip.id,
            userid: req.headers.tokenuserid
        }
        let mobiles = [];
        let alphanumericwithoutspace = new RegExp('^[a-zA-Z0-9]+$');

        time = performance.now();

        await axios.post(microservicesurl.booking + 'getAuthorizationforBooking', reqbody).then(async verifyTrip => {
            console.log(`v3/modifytrip Miroservice getAuthorizationforBooking Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);
            if (verifyTrip.data.status == 200) {
                if (!body.vehicle?.regno) {
                    res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
                }
                // else if (!isValidVehRegno(body.vehicle?.regno)) {
                //     res.send(new APIResponse(202, INVALID_VEHICLE_REGNO))
                // }
                else if (body?.vehicle.regno && (body?.vehicle.regno.length < 4 || body?.vehicle.regno.length > 12)) {
                    res.send(new APIResponse(202, "Vehicle RegNo should be greater than 4 (or) less than or equal to 12 characters"));
                    return false;
                }
                else if (body?.vehicle.regno && !body?.vehicle.regno.match(alphanumericwithoutspace)) {
                    res.send(new APIResponse(202, "Invalid vehicle regno"));
                    return;
                }
                                
                if (!body.portabletracker || body.portabletracker == "" || Object.keys(body.portabletracker).length == 0) {
                    body.portabletracker = { "enabled": "False", "deviceid": "" }
                }
                if (body.portabletracker?.enabled && body.portabletracker.enabled == "True" && (!body.portabletracker?.deviceid && !body.portabletracker?.imei)) {
                    res.send(new APIResponse(202, 'IMEI or Device id is required for portable tracker'));
                    return false;
                }
                else if (body.portabletracker?.enabled && body.portabletracker.enabled == "True" && body.portabletracker?.deviceid && body.portabletracker?.deviceid.length > 24) {
                    res.send(new APIResponse(202, 'Invalid device id'));
                    return false;
                }
                if(body.portabletracker?.enabled && body.portabletracker.enabled == "True" && body.portabletracker?.imei && body.portabletracker?.imei.length > 16)
                {
                    res.send(new APIResponse(202, 'Invalid IMEI number'));
                    return false;
                }                
                if (!body.hasOwnProperty("hasfr") || !body.hasfr) {
                    body.hasfr = false;
                } else {
                    body.hasfr = body.hasfr == "False" ? false : true
                }
                if (!body.hasOwnProperty("hasapptracking") || !body.hasapptracking) {
                    body.hasaptr = false;
                } else {
                    body.hasaptr = body.hasapptracking == "True" ? true : false;
                }               

                if (body.hasOwnProperty('active_track_mno') && body.active_track_mno != "" && !mobiles.includes(body.active_track_mno)) {
                    res.send(new APIResponse(202, 'Invalid Active Track Mobile'));
                }
                else {
                    if (body.vehicle?.type) {
                        if (!validVehicleTypes(body)) {
                            res.send(new APIResponse(202, INVALID_VEHICLE_TYPE));
                            return false;
                        }
                    }
                    if (body.driver?.name) {
                        if (!isValidDriverName(body.driver.name)) {
                            res.send(new APIResponse(202, INVALID_DRIVER_NAME));
                            return false;
                        }
                    }
                    if (!body.origin) {
                        body.origin = {};
                    }
                    if (!body.destination) {
                        body.destination = {};
                    }
                    if (body.origin?.invoices && body.origin?.invoices.length > 0) {
                        if (!checkInvoiceformat(body.origin?.invoices)) {
                            res.send(new APIResponse(202, 'Origin == > Invalid Invoices'));
                            return false;
                        }
                    }
                    if (body.destination?.invoices && body.destination?.invoices.length > 0) {
                        if (!checkInvoiceformat(body.destination?.invoices)) {
                            res.send(new APIResponse(202, 'Destination == > Invalid Invoices'));
                            return false;
                        }
                    }                    
                    body.transporter = body.transporter ? body.transporter : {};
                    if (!body.transporter.hasOwnProperty('name')) {
                        body.transporter.name = ""
                    }
                    if (!body.transporter.hasOwnProperty('code')) {
                        body.transporter.code = ""
                    }
                    body.route = body.route ? body.route : {};
                    if (!body.route.hasOwnProperty('name')) {
                        body.route.name = ""
                    }
                    if (!body.route.hasOwnProperty('code')) {
                        body.route.code = ""
                    }
                    if (!body.route?.code && !body.origin.hasOwnProperty('materials')) {
                        body.origin.materials = []
                    }
                    if (!body.route?.code && !body.destination.hasOwnProperty('materials')) {
                        body.destination.materials = []
                    }
                    if (!body.route?.code && !body.destination.hasOwnProperty('EWB')) {
                        body.destination.EWB = []
                    }
                    body.docs = body.docs ? body.docs : {};
                    if (!body.docs.hasOwnProperty('lrnumber')) {
                        body.docs.lrnumber = ""
                    }
                    if (!body.trip.hasOwnProperty('datetime')) {
                        body.trip.datetime = ""
                    }
                    if (!body.trip.hasOwnProperty('duration')) {
                        body.trip.duration = ""
                    }
                    if (!body.trip.hasOwnProperty('distance')) {
                        body.trip.distance = ""
                    }
                     //Active driver functionality
                     if(body.additionaldrivers?.length > 0)
                     {                    
                         for (let i = 0; i < body.additionaldrivers.length; i++){
                             if(!body.additionaldrivers[i]?.hasOwnProperty('mno'))
                             {
                                 res.send(new APIResponse(202, ADDITIONAL_DRIVER_MSG));
                                 return false;
                             }
                             else if (!isValidDriverMNO(body.additionaldrivers[i].mno)) {
                                 res.send(new APIResponse(202, INVALID_ADDITIONAL_DRIVER_MNO))
                                 return false;
                             }
                         }                    
                     }
                     body.adminemailid = body.adminid;
                    let onBoardDetails:any = await checkVehicleOnboardDetails(body) 
                    if(onBoardDetails?.status == 200)
                    {
                        if(onBoardDetails.data.Status == 400)
                        {
                            body.marketvehicle = "True"
                            if (!body.driver?.mobile) {
                                res.send(new APIResponse(202, DRIVER_MNO_MSG))
                                return;
                            }
                            else if (!isValidDriverMNO(body.driver.mobile)) {
                                res.send(new APIResponse(202, INVALID_DRIVER_MNO))
                                return;
                            }  
                            else{
                                if (!body.driver?.name) {
                                    body.driver.name = "Driver_" + body.driver?.mobile ? body.driver?.mobile : "" 
                                } else if (body?.driver?.name) {
                                    if (!isValidDriverName(body.driver.name)) {
                                        res.send(new APIResponse(202, INVALID_DRIVER_NAME));
                                        return false;
                                    }
                                }
                            }                          
                        }
                        else if(onBoardDetails.data.Status == 200){
                             //Check driver assigned to the vehicle or not
                            if(onBoardDetails.data?.DriverMobileNumber){
                                body.driver = {mobile: onBoardDetails.data?.DriverMobileNumber,
                                    name: onBoardDetails.data?.DriverName ? onBoardDetails.data?.DriverName : "Driver_"+ onBoardDetails.data?.DriverMobileNumber
                                }
                            }
                            else{
                                if (!body.driver?.mobile) {
                                    res.send(new APIResponse(202, DRIVER_MNO_MSG))
                                    return;
                                }
                                else if (!isValidDriverMNO(body.driver.mobile)) {
                                    res.send(new APIResponse(202, INVALID_DRIVER_MNO))
                                    return;
                                }else{
                                    if (!body.driver?.name) {
                                        body.driver.name = "Driver_" + body.driver?.mobile ? body.driver?.mobile : "" 
                                    } else if (body?.driver?.name) {
                                        if (!isValidDriverName(body.driver.name)) {
                                            res.send(new APIResponse(202, INVALID_DRIVER_NAME));
                                            return false;
                                        }
                                    }
                                }   
                            }  
                        }
                    }else{
                        res.send(new APIResponse(202, SOMETHING_WENT_MSG));
                        return false;
                    }
                    if (!body.driver.hasOwnProperty('alternate_mobile')) {
                        body.driver.alternate_mobile = ""
                    }
                    //By default primary driver should be active
                    if(!body.driver.hasOwnProperty('active'))
                    {
                        if(body.additionaldrivers?.length > 0)
                        {
                            for (let i = 0; i < body.additionaldrivers.length; i++){
                                if(body.additionaldrivers[i].hasOwnProperty('active') && body.additionaldrivers[i].active)
                                {
                                    body.driver.active = false;
                                    break;
                                }
                                else{
                                    body.driver.active = true;
                                }
                            }
                        }
                        else{
                            body.driver.active = true;
                        }                    
                    }
                    else  if(!body.driver.active){                   
                        if(body.additionaldrivers?.length > 0)
                        {
                            for (let i = 0; i < body.additionaldrivers?.length; i++){
                                if(body.additionaldrivers[i].hasOwnProperty('active') && body.additionaldrivers[i].active)
                                {
                                    body.driver.active = false;
                                    break;
                                }
                                else{
                                    body.driver.active = true;
                                }
                            }
                        }
                        else{
                            body.driver.active = true;
                            if(body.additionaldrivers?.length > 0)
                            {
                                for (let i = 0; i < body.additionaldrivers.length; i++){
                                    body.additionaldrivers[i].active = false;
                                }
                            }
                        }  
                    }
                    else{
                        body.driver.active = true
                            if(body.additionaldrivers?.length > 0)
                            {
                                for (let i = 0; i < body.additionaldrivers.length; i++){
                                    body.additionaldrivers[i].active = false;
                                }
                            }
                        }
                    body.touchpoints = body.touchpoints ? body.touchpoints : [];
                    if (body.touchpoints.length > 0) {
                        time = performance.now();
                        for (let i = 0; i < body.touchpoints.length; i++) {
                            const tch = body.touchpoints[i];
                            if (!tch.seqno) {
                                res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
                                return false;
                            }
                            // else if (!validateAddress_proper(tch)) {
                            //     res.send(new APIResponse(202, INVALID_TOUCH));
                            //     break;
                            // }

                            else if (tch.invoices && tch.invoices?.length > 0) {
                                if (!checkInvoiceformat(tch.invoices)) {
                                    res.send(new APIResponse(202, 'Touchpoint ' + (i + 1) + ' == > Invalid Invoices'));
                                    return false;
                                }
                            }
                        }

                        console.log(`v3/modifytrip body.touchpoints For Loop Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);


                        try {
                            body.touchpoints = body.touchpoints.sort(function (a, b) {
                                var x = a['seqno']; var y = b['seqno'];
                                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                            });
                        } catch (e) {
                            e = null;
                        }
                    }
                    time = performance.now();
                    let trip_info: any = await getCargoTripInfo({ "bookingid": body.trip?.id });
                    console.log(`v3/modifytrip getCargoTripInfo(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                    if (trip_info.status == 200) { //Only for market vehicle
                        if (trip_info.trip?.vehicleSource > 4 && trip_info.trip?.driver?.mno && trip_info.trip?.vehicle?.regno && (trip_info.trip?.bookingsts == "51" || trip_info.trip?.bookingsts == "54")) {
                            if (body.driver?.mobile != trip_info.trip?.driver?.mno) { // New driver
                                let driver_obj: any = { "mno": body.driver.mobile, "name": "Driver_" + body.driver.mobile }
                                time = performance.now();
                                let marketDriver = false; 
                                let onboardDriverDetails: any = await checkDriverOnboardDetails(body)
                                if(onboardDriverDetails?.status == 200)
                                {
                                    if(onboardDriverDetails.data.Status == 400)
                                    {
                                        marketDriver = true; 
                                    }
                                    else if(onboardDriverDetails.data.Status == 200)
                                    {                                    
                                        marketDriver = false;  
                                    }                            
                                    else {
                                        res.send(new APIResponse(202, onboardDriverDetails.data.Msg));
                                        return false;
                                    }
                                }else{
                                    res.send(new APIResponse(202, SOMETHING_WENT_MSG));
                                    return false;
                                }
                                body.marketDriver = marketDriver;  
                                if(marketDriver){                                                                  
                                    let driver_res: any = await addMarketDriverOnboard(driver_obj);
                                    console.log(`v3/modifytrip addMarketDriverOnboard(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                                    if (driver_res.status == 200 || driver_res.status == 204) {
                                        console.log("Driver onboard or update success")
                                    } else {
                                        res.send(new APIResponse(202, driver_res.message ? driver_res.message : SOMETHING_WENT_MSG));
                                        return false;
                                    }
                                }
                            }
                            if (body.vehicle?.regno != trip_info.trip?.vehicle?.regno) { //new vehicle
                                let veh_obj: any = { "regno": body.vehicle.regno }
                                time = performance.now();
                                let onboard_mvo: any = await addMarketVehicleOnboard(veh_obj);
                                console.log(`v3/modifytrip addMarketVehicleOnboard(); Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                                if (onboard_mvo.status == 200 || onboard_mvo.status == 204) {
                                    console.log("Vehicle onboard or update success")
                                }
                                else {
                                    res.send(new APIResponse(202, onboard_mvo.message ? onboard_mvo.message : SOMETHING_WENT_MSG));
                                    return false;
                                }
                            }
                        }
                    }
                    let consent = body.driver?.driverconsent ? body.driver?.driverconsent : true
                    if (!consent) {
                        body.driver.active = false
                    }
                    time = performance.now();
                    await axios.post(microservicesurl.trips + 'v3/modifytrip', body).then(async result => {
                        console.log(`v3/modifytrip MicroService Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);

                        res.send(result.data);

                        if (result.data.status == 201 && body.trip.getdriverconsent == "True") {

                            await axios.post(microservicesurl.trips + 'getClientVehdata_DrConcent', body).then(async result => {

                                if (result.status == 200) {                                    
                                    result.data.data['driverMno'] = body.driver.mobile;
                                    result.data.data['driverName'] = body.driver.name;
                                    await doSIMRegistration(result.data.data);                                    
                                                               
                                    if (body?.additionaldrivers?.length > 0) {
                                        for (let i = 0; i < body.additionaldrivers.length; i++) {
                                            let objDriver = body.additionaldrivers[i];
                                            if (objDriver && objDriver?.driverconsent == true) {
                                                let reqObj = {
                                                    drivermobile: objDriver?.mno ? objDriver.mno : "",
                                                    drivername: objDriver?.name ? objDriver.name : "",
                                                    simtrackstatus: 2,///2
                                                    vehiclenumber: body?.vehicle?.regno ? body.vehicle.regno : "",
                                                    simtracktype: 'N',///'N'
                                                    enterprisename: body?.enterpriseName ? body.enterpriseName : "",/// 'RCP'--- based on clientkey
                                                    driverid: "",//optional
                                                    clientid: body?.clientId ? body.clientId : "",///11
                                                    vehicletagname: body?.tagName ? body.tagName : "",
                                                    adminid: body?.adminId ? body.adminId : ""//// unique id
                                                }
                                                let simRes = await SIMRegistration_V2(reqObj);
                                            }
                                        }
                                    }
                                }

                            }).catch(error => {
                                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
                            });
                        }
                    }).catch(error => {
                        console.log("catch error inner -->" + error.message)
                        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
                    });

                }
            }
            else {
                res.send(verifyTrip.data);
            }
        }).catch(error => {
            console.log("Error in catch getAuthorizationforBooking: " + error.message)
            res.send(new APIResponse(205, SOMETHING_WENT_MSG))
        })
    } catch (error) {
        console.log("catch error -->" + error.message)
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})

/** This method is used for get the driver sim status api */
function getCargoTripInfo(body: any) {
    return new Promise(async (resolve, reject) => {
        try {
            await axios.post(microservicesurl.trips + 'v1/get_trip_info', body).then(async result => {
                resolve(result.data)
            }).catch(error => {
                console.log("Error in inner catch v1/get_trip_info method ,Error is : " + error.message);
                resolve({ status: 205, msg: SOMETHING_WENT_MSG });
            })
        }
        catch (err) {
            console.log("Error in final catch v1/get_trip_info method ,Error is : " + err.message);
            resolve({ status: 205, msg: SOMETHING_WENT_MSG });
        }
    });
}
/** This method is used to get created trip request status */
router.post('/v1/getTripRequestStatus', async (req, res) => {
    try {
        body = req.body;

        await axios.post(microservicesurl.trips + 'v1/getTripRequestStatus', body).then(async result => {
            res.send(result.data);

        }).catch(error => {
            res.send(new APIResponse(205, SOMETHING_WENT_MSG))
        });


    } catch (error) {
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})

/** This method is used to get Asset access token */
router.post("/v3/gettoken", async (req, res) => {
    try {
        body = req.body;
        let token;
        let expires_in;
        if (!body.username) {
            res.send(new apitokenResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.password) {
            res.send(new apitokenResponse(202, MANDATORY_ERROR_MSG))
        }
        else {
            let encryptedpwd = await getEncryptPassword(body.password)
            let jsonbody = { username: body.username, password: encryptedpwd }
            await axios.post(microservicesurl.trips + 'v3/user-validate', jsonbody).then(async result => {
                if (result.data) {
                    let loginResonse: any = result.data;
                    if (loginResonse.status == 201) {
                        let userToken: any = await getTripsToken(loginResonse.userid);
                        if (userToken.status == 200) {
                            let expiresEpoch = Number(userToken.data.tokens[0].expiresin);
                            let currentEpoch = Date.now();
                            if ((expiresEpoch > currentEpoch) && userToken.data.tokens[0].tokenkey != "") {
                                token = userToken.data.tokens[0].tokenkey;
                                expires_in = Number(userToken.data.tokens[0].expiresin)
                            } else {
                                await removeTripsToken(loginResonse.userid, userToken.data.tokens[0].token);
                                let genTokenResp = await generateToken(loginResonse.userid);
                                await insertTripsToken(loginResonse.userid, genTokenResp, loginResonse.adminName);
                                token = genTokenResp.tokenkey;
                                expires_in = Number(genTokenResp.expires_in)
                            }
                        } else {
                            let genTokenResp = await generateToken(loginResonse.userid);
                            await insertTripsToken(loginResonse.userid, genTokenResp, loginResonse.adminName);
                            token = genTokenResp.tokenkey;
                            expires_in = Number(genTokenResp.expires_in)
                        }
                    }

                    res.send(new apitokenResponse(loginResonse.status, loginResonse.message, token, loginResonse.customerid, loginResonse.userid, expires_in));
                }
            }).catch(error => {
                console.log("Error in inner catch block user-validate : " + error.message)
                res.send(new apitokenResponse(205, SOMETHING_WENT_MSG, '', ''));
            });
        }

    } catch (error) {
        console.log("Error in final catch block user-validate : " + error.message)
        res.send(new apitokenResponse(205, SOMETHING_WENT_MSG, '', ''));
    }
});

/** This method is used to call update trip API */
router.post('/v3/updatetripstatus', async (req, res) => {
    try {

        let time = performance.now();

        body = req.body.trip;
        var alphanumericregex = /^[a-zA-Z][a-zA-Z0-9 ]*$/
        let  tripcompleteresnvalue = /^[1234]$/
        if (!body) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        if (!body.id) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        else if (body?.completereason && !body.completereason.toString().match(tripcompleteresnvalue) ) {
            res.send(new APIResponse(400, 'Invalid Trip Complete Reason '));
        }
        else if (body?.completecomment ? !body.completecomment.match(alphanumericregex) : "") {
            res.send(new APIResponse(400, 'Comments contain only alphanumaric value'));
        }
        let reqbody = {
            adminemailid: req.headers.adminemailid,
            bookingid: body.id,
            userid: req.headers.tokenuserid
        }
        time = performance.now();
        await axios.post(microservicesurl.booking + 'getAuthorizationforBooking', reqbody).then(async verifyTrip => {

            console.log(`v3/updatetripstatus MisroService getAuthorizationforBooking Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);


            if (verifyTrip.data.status == 200) {

                if (!body.status) {
                    res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
                }
                // else if (!body.seqno) {
                //     res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
                // }
                else if (!validTripStatusInUpdate1(body.status, body.seqno)) {
                    res.send(new APIResponse(203, UPDATE_INVALID_REQ_MSG))
                }
                else {
                    body.settingID=globalSettingsId;
                    if (body.seqno == null || body.seqno == '') {
                        time = performance.now();
                        await axios.post(microservicesurl.trips + 'v3/update-trip', body).then(async result => {

                            console.log(`v3/updatetripstatus MisroService v3/update-trip Response time ${moment().format("DD/MM/YYYY hh:mm:ss A")} Duration is || ${(performance.now() - time) / 1000} seconds`);


                            res.send(result.data);

                            /** This block of code used for sim active functionality implementation */
                            if (Number(body.status) == 54 && result.data.status == 201) {
                                console.log("bookingid sts 54 .. " + body.id);
                                let trip_info: any = await getCargoTripInfo({ "bookingid": body.id });
                                if (trip_info.status == 200) {
                                    if (trip_info.trip?.driver?.mno && trip_info.trip?.bookingsts == "54") {
                                        let driverStatusRes: any = await getSimDriverlivestatus({ "drivermobile": trip_info.trip?.driver?.mno });
                                        if (driverStatusRes.status == 200) {
                                            if (driverStatusRes.data.sts == "1") {
                                                trip_info.trip['driverMno'] = trip_info.trip?.driver?.mno;
                                                trip_info.trip['driverName'] = trip_info.trip?.driver?.name;
                                                trip_info.trip['regNo'] = trip_info.trip?.vehicle?.regno;
                                                trip_info.trip['adminId'] = trip_info.trip?.adminid;
                                                doSIMRegistration(trip_info.trip);
                                            } else if (driverStatusRes.data.sts == "3") {
                                                let device_res: any = await simactiveinactive_withlatlangs(trip_info.trip?.driver?.mno);
                                                console.log("End simactiveinactive_withlatlangs .. " + body.id);
                                            }
                                        }
                                    }
                                }
                                axios.post(microservicesurl.trips + 'v2/status-update-cargo-trips', body).then(result => {

                                });
                            }

                        }).catch(error => {
                            console.log("Error in inner v3/updatetripstatus  " + error.message);
                            res.send(new APIResponse(205, SOMETHING_WENT_MSG))
                        });
                    } else {
                        try {
                            body.index = Number(body.seqno) - 1;
                            await axios.post(microservicesurl.trips + 'v2/update-touchpoint-status', body).then(result => {
                                res.send(result.data);
                            });
                        } catch (e) {
                            console.log("Error in final 1 v3/updatetripstatus  " + e.message);
                            e = null;
                            res.send(new APIResponse(205, SOMETHING_WENT_MSG))
                        }
                    }
                }
            }
            else {
                res.send(verifyTrip.data);
            }
        }).catch(error => {
            console.log("Error in catch getAuthorizationforBooking: " + error.message)
            res.send(new APIResponse(205, SOMETHING_WENT_MSG))
        })
    } catch (error) {
        console.log("Error in final v3/updatetripstatus  " + error.message);
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})

function getSimDriverMobileNo(body: any) {
    return new Promise(async (resolve, reject) => {
        try {
            await axios.post(microservicesurl.marketVehicle_CAM_url + '/v1/addMarketDriver', body).then(async result => {
                resolve(result.data)
            }).catch(error => {
                console.log("Error in inner catch  getSimDriverMobileNo method ,Error is : " + error.message);
                resolve({ status: 205, msg: SOMETHING_WENT_MSG });
            })
        }
        catch (err) {
            console.log("Error in final catch getSimDriverMobileNo method ,Error is : " + err.message);
            resolve({ status: 205, msg: SOMETHING_WENT_MSG });
        }
    });
}

//** This method is used to send the consent to driver */
router.post('/v3/sendsimtrackconsent', async (req, res) => {
    try {
        body = req.body;
        if (!body.clientkey) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        if (!body.driver.name) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverName(body.driver.name)) {
            res.send(new APIResponse(202, INVALID_DRIVER_NAME))
        }
        else if (!body.driver.mobile) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverMNO(body.driver.mobile)) {
            res.send(new APIResponse(202, INVALID_DRIVER_MNO))
        }


        else {
            // body.marketVehicle = 1 // Own
            // body.marketVehicle = 2 // Market
            body.marketVehicle = 1;
            if (body.hasOwnProperty("marketVehicle")) {
                body.marketVehicle = body.marketVehicle == "True" ? 2 : 1;
            }
        }
        let obj: any;
        let tripsUrl = true;
        let driverMobileNo: any;
        if (body.marketVehicle == 2) {
            driverMobileNo = await getSimDriverMobileNo({ "mno": body.driver.mobile });
            console.log("driverStatusRes  .. " + JSON.stringify(driverMobileNo));
            if (driverMobileNo.status == 200 || driverMobileNo.status == 204) {
                res.send(new APIResponse(driverMobileNo.status, driverMobileNo.message))
                tripsUrl = true
            } else {
                res.send(new APIResponse(driverMobileNo.status, driverMobileNo.message))
                tripsUrl = false
                return false;
            }
        }
        if (tripsUrl) {
            await axios.post(microservicesurl.trips + 'getClientVehdata_DrConcent', body).then(async result => {

                if (result.data.status == 200) {
                    result.data.data['driverMno'] = body.driver.mobile;
                    result.data.data['driverName'] = body.driver.name;

                    if (body.marketVehicle == 2) {
                        // market
                        if (result.data.data.simtrackstatus == "1") {
                            obj = await doSIMRegistration(result.data.data);
                        }
                    } else {
                        // own
                        obj = await doSIMRegistration(result.data.data);
                    }
                    res.send(obj);
                } else {
                    res.send(result.data);
                }
            }).catch(error => {
                console.log("Error in inner catch  /v3/sendsimtrackconsent method ,Error is : " + error.message);
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            });

        }
    }
    catch (error) {
        console.log("Error in final catch /v3/sendsimtrackconsent method ,Error is : " + error.message);
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})


/** Custom trip API methods end */

/** This method is used to call update trip API */
router.post('/v2/modifytrip', async (req, res) => {
    try {
        body = req.body;
        if (!body.clientkey) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.vehicle.regno) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidVehRegno(body.vehicle.regno)) {
            res.send(new APIResponse(202, INVALID_VEHICLE_REGNO))
        }
        else if (!body.vehicle.type) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!validVehicleTypes(body)) { //need to change the code for validating the veh type
            res.send(new APIResponse(202, INVALID_VEHICLE_TYPE))
        }
        else if (!body.driver.name) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverName(body.driver.name)) {
            res.send(new APIResponse(202, INVALID_DRIVER_NAME))
        }
        else if (!body.driver.mobile) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverMNO(body.driver.mobile)) {
            res.send(new APIResponse(202, INVALID_DRIVER_MNO))
        }
        else if (!body.origin.lat) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.origin.lon) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidCoordinates(parseFloat(body.origin.lat), parseFloat(body.origin.lon))) {
            res.send(new APIResponse(202, INVALID_ORIGIN_LATLONG))
        }
        else if (!body.destination.lat) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.destination.lon) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidCoordinates(parseFloat(body.destination.lat), parseFloat(body.destination.lon))) {
            res.send(new APIResponse(202, INVALID_DEST_LATLONG))
        }
        else if (!body.trip.autostarttrip) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.trip.autoendtrip) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.trip.datetime) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        // else if (!isValidDatetime(body.trip.datetime)) {
        //     res.send(new APIResponse(202, INVALID_DATETIME))
        // }
        else if (!body.tripid) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        }
        // else if (!body.tripstatus) {
        //     res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
        // }
        else {
            body.touchpoints = body.touchpoints ? body.touchpoints : [];
            if (body.touchpoints.length > 0) {


                for (let i = 0; i < body.touchpoints.length; i++) {
                    const tch = body.touchpoints[i];
                    if (!tch.seqno) {
                        res.send(new APIResponse(202, MANDATORY_ERROR_MSG));
                        break;
                    }
                    else if (!tch.lat) {
                        res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
                        break;
                    }
                    else if (!tch.lon) {
                        res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
                        break;
                    }
                    else if (!isValidCoordinates(parseFloat(tch.lat), parseFloat(tch.lon))) {
                        res.send(new APIResponse(202, INVALID_TOUCH_LATLONG))
                        break;
                    }
                }

                try {
                    body.touchpoints = body.touchpoints.sort(function (a, b) {
                        var x = a['seqno']; var y = b['seqno'];
                        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                    });
                } catch (e) {
                    e = null;
                }
            }

            await axios.post(microservicesurl.trips + 'v2/modify-trip', body).then(async result => {
                res.send(result.data);

                if (result.data.status == 201 && body.trip.getdriverconsent == "True") {

                    await axios.post(microservicesurl.trips + 'getClientVehdata_DrConcent', body).then(async result => {

                        if (result.status == 200) {
                            result.data.data['driverMno'] = body.driver.mobile;
                            result.data.data['driverName'] = body.driver.name;
                            await doSIMRegistration(result.data.data);
                        }
                    }).catch(error => {
                        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
                    });
                }
            }).catch(error => {
                console.log("catch error inner -->" + error.message)
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            });

        }
    } catch (error) {
        console.log("catch error -->" + error.message)
        res.send(new APIResponse(205, SOMETHING_WENT_MSG))
    }
})

router.post('/v1/GetConsentForSIM', async (req, res) => {
    try {
        let body = req.body;
        if (body.mobileno.length == 0) {
            res.send(new APIResponse(201, mobileMsg));
        }
        else {
            let mobileNos = [];
            let invalidMobileNo: Boolean = false;
            if(body?.mobileno?.length)
            {
                for (let i = 0; i < body.mobileno.length; i++) {
                    const mobileNo: any = body.mobileno[i];
                    if (mobileNo && isValidDriverMNO(mobileNo)) {
                        invalidMobileNo = false;
                        mobileNos.push(mobileNo);
                    }
                    else {
                        invalidMobileNo = true;
                        break;
                    }
                }
            }            
            if (!invalidMobileNo) {
                let resobject: any = [];
                let loginbody: any = { username: microservicesurl.sim_track_username, password: microservicesurl.sim_track_password }
                let loginResult:any = await simtrackLogin(loginbody);
                if (loginResult.token) {
                    for(let i = 0; i < mobileNos.length; i++)
                    {
                        //Get device status from jiolacate api
                        let response:any = await devicestatus(mobileNos[i], loginResult.token);
                        if (response.status == 200 || response.status == 405 ) {
                            resobject.push({ mobileno: mobileNos[i], status: response?.consent_status ? response.consent_status: "", network_type: response.networkType });
                        }else if(response.status == 401){
                            //If token expired then retry logic
                            loginResult = await simtrackLogin(loginbody);
                            if (loginResult.token) {
                                response = await devicestatus(mobileNos[i], loginResult.token);
                                if (response.status == 200 || response.status == 405 ) {
                                    resobject.push({ mobileno: mobileNos[i], status: response?.status ? response.consentStatus: "", network_type: response.networkType });
                                }
                                else{
                                    resobject.push({ mobileno: mobileNos[i], status: response?.message});
                                } 
                            }
                            else{
                                console.log("Error in jiolocate API token generation");
                            } 
                        }
                        else{
                            resobject.push({ mobileno: mobileNos[i], status: response?.message});
                        }                           
                    }
                    res.send(new details(200,"Success", resobject));
                }
                else{
                    console.log("Error in jiolocate API token generation");
                    res.send(new APIError(400, INVALID_CREDENTIALS_MSG));                    
                } 
            }
            else {
                res.send(new APIError(202, INVALID_DRIVER_MNO));
            }
        }
    } catch (error) {
        console.log("Error in outer catch /v1/GetConsentForSIM: " + error.message);
        let _response: any = new APIError(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})
router.post('/shareTripLink', async (req, res) => {
    try {
        let body = req.body;
        let MOBILE_USER_REGX = /^[5-9][0-9]{9}$/;
        let emailValidation = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
        body.adminemailid = req.headers.adminemailid;
        let findDuplicatesemail = body.emailid.filter((item, index) => body.emailid.indexOf(item) !== index)
        let findDuplicatesnumber = body.mobileno.filter((item, index) => body.mobileno.indexOf(item) !== index)
        let emaildcheck: any, mbnumcheck: any
        let invalidemail: boolean = false
        let invalidnum: boolean = false
        let Emailvalidation = body.emailid
        Emailvalidation.forEach(element => {
            emaildcheck = element.match(emailValidation)
            if (emaildcheck == null) {
                console.log("emaildcheck", emaildcheck)
                invalidemail = true
            }
        });
        let mobilevalidation = body.mobileno
        mobilevalidation.forEach(element => {
            mbnumcheck = element.match(MOBILE_USER_REGX)
            if (mbnumcheck == null) {
                console.log("mbnumcheck", mbnumcheck)
                invalidnum = true
            }
        });

        // Inorder to restrict the modifications done by the other adminid ( start )
        let validateRequest: any = await validateJsonData(body);
        if (validateRequest.status == 200) {
            if (!body.uid) {
                res.send(new SHARETRIPResponse(201, "User id is required"))
            }
            else if (req.body.adminemailid != body.uid) {
                res.send(new SHARETRIPResponse(201, "Invalid User Id"))
            }
            else if (!body.bkey) {
                res.send(new SHARETRIPResponse(201, 'bkey is required'))
            }
            else if (!body.cts) {
                res.send(new SHARETRIPResponse(201, 'cts is required'))
            }
            else if (!body.tid) {
                res.send(new SHARETRIPResponse(201, 'tid is required'))
            }
            else if (!body.url) {
                res.send(new SHARETRIPResponse(201, 'url is required'))
            }
            else if (body?.emailid.length == 0 && body?.mobileno.length == 0) {
                res.send(new SHARETRIPResponse(201, 'Email or Mobileno is required'))
            }
            else if (body?.emailid.length > 0 && invalidemail) {
                res.send(new SHARETRIPResponse(201, 'Invalid Email'))
            }
            else if (body.emailid.length > 10) {
                res.send(new SHARETRIPResponse(400, "Maximum 10 Email can be added"));
                return
            }
            else if (findDuplicatesemail.length > 0) {
                res.send(new SHARETRIPResponse(400, "Duplicate Email added"));
                return
            }
            else if (body?.mobileno.length > 0 && invalidnum) {
                res.send(new SHARETRIPResponse(201, 'Invalid Mobile Number'))
            }
            else if (body.mobileno.length > 10) {
                res.send(new SHARETRIPResponse(400, "Maximum 10 Mobile Number can be added"));
                return
            }
            else if (findDuplicatesnumber.length > 0) {
                res.send(new SHARETRIPResponse(400, "Duplicate Mobile Number added"));
                return
            }
            else {
                let reqbody = {
                    adminemailid: req.headers.adminemailid,
                    bookingid: body.tid,
                    userid: req.headers.tokenuserid
                }
                await axios.post(microservicesurl.booking + 'getAuthorizationforBooking', reqbody).then(async result => {
                    try {
                        if (result.data.status == 200) {
                            await axios.post(microservicesurl.trips + 'shareTripLink', body).then(async result => {
                                // let response = result.data;
                                res.send(result.data);

                            }).catch(error => {
                                res.send({ status: 205, msg: "Something went wrong" })
                            });
                        }
                        else {
                            res.send(result.data);
                        }
                    }
                    catch (error) {
                        res.send({ status: 205, msg: SOMETHING_WENT_MSG });
                    }
                }).catch(error => {
                    res.send({ status: 205, msg: SOMETHING_WENT_MSG })
                });
            }
        }
        else {
            res.send(validateRequest);
        }


    } catch (error) {
        res.send({ status: 205, msg: SOMETHING_WENT_MSG });
    }
});

router.post('/v1/cargo-trips-details', async (req, res) => {
    try {
        let body = req.body;
        if (!body.tripid) {
            res.send(new APIError(400, tripIdErrMsg))
            return
        }
        else {
            let reqbody = {
                "bookingid": body.tripid,
                "adminemailid": req.headers.adminemailid,
                "userid": req.headers.tokenuserid
            }
            await axios.post(microservicesurl.booking + 'userAuthorizationforBooking', reqbody).then(async authresponse => {
                try {
                    if (authresponse?.data?.status == 200) {
                        let additinalDriverData: any = []
                        await axios.post(microservicesurl.trips + 'v1/cargo-trips-details', body).then(async result => {
                            let response = result.data;
                            if (response?.status == 200) {
                                let driverMnoList = [];
                                if (response?.data.length > 0) {
                                    response.data.forEach(ele => {
                                        additinalDriverData = ele.additionaldrivers
                                        additinalDriverData.forEach(element => {
                                            driverMnoList.push(element.mno)
                                        });

                                        driverMnoList.push(ele.driver.mno);
                                    });
                                } else {
                                    console.log("cargo-trips-details data not available")
                                }
                                let reqObj = { mobilenos: [...new Set(driverMnoList)] };
                                await axios.post(microservicesurl.usermanagementpath + "/simtrackstatus", reqObj).then(dvrResult => {
                                    let driverResponse = dvrResult.data;
                                    if (driverResponse?.status == 200) {
                                            for (let i = 0; i < response?.data.length; i++) {
                                                let ele = response.data[i];
                                                let secondaryDriverSimStatus: any = [];
                                                ele.simtrackingstatus = "1";
                                                if (driverResponse?.data.length > 0) {
                                                    for (let j = 0; j < driverResponse?.data.length; j++) {
                                                        let dvrEle = driverResponse.data[j];
                                                        if (ele.driver.mno == dvrEle.mobileno) {
                                                            ele.simtrackingstatus = dvrEle.status;
                                                            break;
                                                        }
                                                        else {
                                                            for (let k = 0; k < ele.additionaldrivers.length; k++) {
                                                                let sec_dvrEle = ele.additionaldrivers[k];
                                                                if (sec_dvrEle.mno == dvrEle.mobileno) {
                                                                    let _obj: any = new Object();
                                                                    _obj.driverconsent = sec_dvrEle.driverconsent;
                                                                    _obj.name = sec_dvrEle.name;
                                                                    _obj.mno = sec_dvrEle.mno;
                                                                    _obj.dtype = sec_dvrEle?.dtype;
                                                                    _obj.simtrackingstatus = dvrEle.status;
                                                                    _obj.active = sec_dvrEle.active
                                                                    secondaryDriverSimStatus.push(_obj)

                                                                }
                                                            }
                                                        }

                                                    }
                                                    ele.additionaldrivers = secondaryDriverSimStatus
                                                }
                                                else {
                                                    console.log("simtrackstatus data not available")
                                                }
                                            }

                                            res.send(result.data);
                                        
                                    } else {
                                        console.log("No Data Available In simtrackstatus")
                                        res.send(dvrResult.data);
                                    }
                                }).catch(error => {
                                    console.log("Error In simtrackstatus", error.message)
                                    return res.send({ status: 205, msg: "Something Went Wrong" })
                                });
                            }
                            else {
                                console.log("No Data Available In v1/cargo-trips-details")
                                res.send(result.data);
                            }
                        }).catch(error => {
                            console.log("Error In v1/cargo-trips-details method", error.message)
                            res.send({ status: 205, msg: SOMETHING_WENT_MSG })
                        });
                    }
                    else {
                        console.log("No Data Available In getAuthorizationforBooking")
                        res.send(authresponse.data);
                    }
                }
                catch (error) {
                    console.log("Error In getAuthorizationforBooking method", error.message)
                    res.send({ status: 205, msg: SOMETHING_WENT_MSG });
                }

            }).catch(error => {
                console.log("Error In Outer Catch Block getAuthorizationforBooking Method", error.message)
                res.send({ status: 205, msg: SOMETHING_WENT_MSG })
            });

        }
    } catch (error) {
        console.log(error.message)
        res.send({ status: 205, msg: SOMETHING_WENT_MSG });
    }
})

//Update driver information in trip
router.post('/v1/update-trip-driver', async (req, res) => {
    let body = req.body;
    try{

        if(!body.tripid){
            res.send(new APIError(400, tripIdErrMsg))
            return;
        }else if(!body.primaryDriver && !body.secondaryDriver){
            res.send(new APIError(400,"Driver information required"))
            return;
        }
        else if(body.primaryDriver && !body.primaryDriver.hasOwnProperty("active") && body.secondaryDriver && !body.secondaryDriver.hasOwnProperty("active") && !body.secondaryDriver.hasOwnProperty("mobile") )
        {
            res.send(new APIError(400,"Driver information required"))
            return;
        }
        if(body.secondaryDriver && body.secondaryDriver?.mobile)
        {
            if (!isValidDriverMNO(body.secondaryDriver.mobile)) {
                res.send(new APIResponse(202, INVALID_DRIVER_MNO))
                return;
            }
        }
        if(!body.primaryDriver){
            if(body.secondaryDriver && !body.secondaryDriver?.name && !body.secondaryDriver?.mobile){
            res.send(new APIError(400,"Secondary Driver name and mobile number is required"))
            return;
            }
        }
        if(body.primaryDriver && body.primaryDriver.hasOwnProperty('active') && !body.primaryDriver.active && body.secondaryDriver && body.secondaryDriver.hasOwnProperty('active') && body.secondaryDriver?.active){
            body.primaryDriver.active= false;
        }
        let reqbody = {
            "bookingid": body.tripid,
            "adminemailid": req.headers.adminemailid,
            "userid": req.headers.tokenuserid
        }
        await axios.post(microservicesurl.booking + 'userAuthorizationforBooking', reqbody).then(async authresponse => {
            try{
                if (authresponse?.data?.status == 200) {                    
                    body.tokenuserid = req.headers.tokenuserid;
                    await axios.post(microservicesurl.trips+"update-trip-driver",body).then(async response =>{
                        res.send(response.data);   
        
                    }).catch(error => {
                        console.log("Error in /v1/update-trip-driver inner catch block and error is: "+error.message);
                        res.send(new APIError(400, SOMETHING_WENT_ERR_MSG));
                    })
                }else{
                    console.log("No Data Available In userAuthorizationforBooking")
                    res.send(authresponse.data);
                }
            }
            catch(err){
                console.log("Error in userAuthorizationforBooking inner catch block and error is : "+err.message);
                res.send(new APIError(400, SOMETHING_WENT_ERR_MSG));
            }            
        }).catch(error => {
            console.log("Error In Outer Catch Block userAuthorizationforBooking Method", error.message)
            res.send({ status: 205, msg: SOMETHING_WENT_MSG })
        });
    }
    catch(err){
        console.log("Error in /v1/update-trip-driver outer catch block and error is: "+err.message);
        res.send(new APIError(400, SOMETHING_WENT_ERR_MSG));
    }    
})

export = router