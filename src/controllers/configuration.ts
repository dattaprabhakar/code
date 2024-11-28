import Router from 'express';
import axios from 'axios'
import { loggerDetails, microservicesurl } from './../utils/config';
import { CONFIG_APIResponse, tokenResponse, APIError, ResponseLocation, Response, ResponseWithOnlyPage, Page, ResponseWithObject, configTokenResponse, APIResponse } from './../utils/status';
import { generateToken } from './../utils/JWTToken';
var router = Router()
import moment from 'moment';
import {
    cusIdErrMsg, nodataMsg, orgIdErrMsg, INVALID_DRIVER_NAME, SOMETHINGMSG, SOMETHING_WENT_MSG, IMEI_MSG, IMSI_MSG, LOGIN_ID, CLIENT_ID, DEVICE_MSG, DEVICE_MODEL, DEVICE_TYPE_MSG, SIM_NO,
    USER_ID, adminIdErrMsg, nameErrMsg, mnoErrMsg, AADHAR_NUMBER_MSG, PAN_NUMBER_MSG, dvrIdErrMsg, errdelMsg, REG_NO, ASSET_NAME, ASSET_TYPE, ASSET_MAKE, ASSET_MODEL,
    ASSET_YEAR, HASNOTRACKER, PD_ID, FLEET_ID, UPDATED_DATE, SAVEMODE_MSG, DEVICE_VENDOR, MANDATORY_ERROR_MSG, SOMETHING_WENT_ERR_MSG, NO_DATA_AVL_MSG, MAILID_VALIDATE_MSG,
    conidMsg, taxNoMsg, taxIdMsg, tagIdMsg, stateMsg, pincodeMsg, mobLengthMsg, mobileMsg, longMsg, latMsg, fullnameMsg, createdByMsg, countryMsg, cityMsg, contidMsg,
    locationErrMsg, custIdMustNull, BAD_REQ, LOCATION_NAME_, STOP_LONGITUDE_MSG, STOP_LATITUDE_MSG, LOCATION_TYPE_MSG, LOCATION_ID, idErrMsg, mobileLengthErrMsg, mobileErrMsg,
    EXCEPTION_MSG, isExcelMsg, pageSizeMsg, indexMsg, PageNotMsg, UID_ERR_MSG, CID_ERR_MSG, IndexNotMsg, pinLengthMsg, pageNoErrMsg, tagIdErrMsg, taxIdErrMsg, countryIdErrMsg, stateIdErrMsg, VEHICLE_TYPE,
    VEHICLE_MANUFACTURER, VEHICLE_MODEL, LOCATION_LATITUDE_MSG, LOCATION_LONGIITUDE_MSG, custNameErrMsg, custNameValidMsg, PHONE_VALIDATE_MSG, ALERT, DRIVER, DEVICE, FUEL, VEHICLE, ENTERPRISE, MODULE_TYPE, DRIVER_ID_EMPTY, address1Msg, address2Msg, NameValidMsg, NUMBER_VALIDATE_MSG, TAXNUMBER_VALIDATE_MSG, PASSCODEMESSAGE, PASSCODEERRORMESSAGE, orgName, orgEmail, orgContract, PINCODE_VALIDATE_MSG, orgNameValidMsg, orgmobileErrMsg, TAXNUM_VALIDATE_MSG, addressErrMsg, geoTripErrMsg, stateErrMsg
    , LICENSE_NUMBER_MSG, BADGE_NUMBER_MSG, IMEI_VAILD_MSG, IMSI_VAILD_MSG, TAG_VAILD_MSG, REG_VAILD_MSG, Valid_LOCATION_NAME_, MCODE_VALIDATE_MSG, MNAME_VALIDATE_MSG, MTYPE_VALIDATE_MSG, SCODE_VALIDATE_MSG, HCODE_VALIDATE_MSG, DESC_VALIDATE_MSG, materialErrMsg, Mname_minmax, material_code_Msg, material_val, Mcode_minmax, MTY_VAL, Mtype_minmax, SKUCode_minmax, HSN_VAL, HSNCode_minmax, desc_minmax, SKU_VAL, MNameValidMsg, loginIdErrMsg, erpcodeMsg, erpLengthMsg, geoRadiusMsg,VEHICLE_REG_MIN_MAX,VEHICLE_TAG_MIN_MAX
} from './../utils/errormsg';
import { getEncryptPassword, setEncryptString } from './../utils/common';
import { SIMRegistration_V1, validateJsonData, isExitUserLogin, getUserToken, insertUserToken, removeUserToken ,addDeviceinJMTI} from './common';


let ip = require('ip').address();
var dateFormat = require('dateformat');
const jsonheader = {
    'Content-Type': 'application/json'
}

/** This method is used to get Asset access token */
router.post("/v1/gettoken", async (req, res) => {
    try {
        let body = req.body;
        let token;
        let expires_in;
        if (!body.username) {
            res.send(new configTokenResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.password) {
            res.send(new configTokenResponse(202, MANDATORY_ERROR_MSG))
        }
        else {
            let encryptedpwd = await getEncryptPassword(body.password)
            let jsonbody = { username: body.username, password: encryptedpwd }
            await axios.post(microservicesurl.configurationpath + 'v1/user-validate', jsonbody).then(async result => {
                if (result.data) {
                    let loginResonse: any = result.data;
                    if (loginResonse.status == 201) {

                        let userToken: any = await getUserToken(loginResonse.userid);

                        if (userToken.status == 200) {
                            let expiresEpoch = Number(userToken.data.tokens[0].expiresin);
                            let currentEpoch = Date.now();

                            if ((expiresEpoch > currentEpoch) && userToken.data.tokens[0].tokenkey != "") {
                                token = userToken.data.tokens[0].tokenkey;
                                expires_in = Number(userToken.data.tokens[0].expiresin)
                            } else {
                                await removeUserToken(loginResonse.userid, userToken.data.tokens[0].token);
                                let genTokenResp = await generateToken(loginResonse.userid);
                                await insertUserToken(loginResonse.userid, genTokenResp, body.adminid);
                                token = genTokenResp.tokenkey;
                                expires_in = Number(genTokenResp.expires_in)
                            }
                        } else {
                            let genTokenResp = await generateToken(loginResonse.userid);
                            await insertUserToken(loginResonse.userid, genTokenResp, body.adminid);
                            token = genTokenResp.tokenkey;
                            expires_in = Number(genTokenResp.expires_in)
                        }

                    }
                    res.send(new configTokenResponse(loginResonse.status, loginResonse.message, token, loginResonse.userid, loginResonse.clientid, loginResonse.adminid, expires_in));
                }
            }).catch(error => {
                res.send(new configTokenResponse(205, SOMETHING_WENT_MSG, '', ''));
            });
        }

    } catch (error) {
        res.send(new configTokenResponse(205, SOMETHING_WENT_MSG, '', ''));
    }
});

router.post("/v1/device/createAndUpdate", async (req, res) => {
    try {
        let body = req.body;
        let patternNumOnly = /^[0-9]+$/;

        if (!body.IMEI) {
            res.send(new CONFIG_APIResponse(400, IMEI_MSG));
            return
        } else if (!body.IMSI) {
            res.send(new CONFIG_APIResponse(400, IMSI_MSG));
            return
        } else if (!body.adminid) {
            res.send(new CONFIG_APIResponse(400, adminIdErrMsg));
            return
        } else if (!body.clientId) {
            res.send(new CONFIG_APIResponse(400, CLIENT_ID));
            return
        } else if (!body.device) {
            res.send(new CONFIG_APIResponse(400, DEVICE_MSG));
            return
        } else if (!body.deviceModel) {
            res.send(new CONFIG_APIResponse(400, DEVICE_MODEL));
            return
        } else if (!body.deviceSimNo) {
            res.send(new CONFIG_APIResponse(400, SIM_NO));
            return
        } else if (!body.deviceType) {
            res.send(new CONFIG_APIResponse(400, DEVICE_TYPE_MSG));
            return
        } else if (!body.deviceVendor) {
            res.send(new CONFIG_APIResponse(400, DEVICE_VENDOR));
            return
        } else if (!body.saveMode) {
            res.send(new CONFIG_APIResponse(400, SAVEMODE_MSG));
            return
        } else if (!patternNumOnly.test(body.IMEI)) {
            res.send(new CONFIG_APIResponse(400, IMEI_VAILD_MSG));
            return
        } else if (!patternNumOnly.test(body.IMSI)) {
            res.send(new CONFIG_APIResponse(400, IMSI_VAILD_MSG));
            return
        }
        else {
            body["userId"] = req.headers.tokenuserid;
            body["loginId"] = body.adminid;
            await axios.post(microservicesurl.configurationpath + 'v1/device/createAndUpdate', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send({ status: 204, msg: "No data available" })
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG))
            });
        }
    } catch (error) {
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG));
        return
    }
})

router.post("/v1/device/delete", async (req, res) => {
    try {
        let body = req.body;
        if (!body.IMEI) {
            res.send(new CONFIG_APIResponse(400, IMEI_MSG));
            return
        } else if (!body.loginId) {
            res.send(new CONFIG_APIResponse(400, LOGIN_ID));
            return
        } else if (!body.clientId) {
            res.send(new CONFIG_APIResponse(400, CLIENT_ID));
            return
        } else {
            await axios.post(microservicesurl.configurationpath + 'v1/device/delete', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send({ status: 204, msg: "No data available" })
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG))
            });
        }
    } catch (error) {
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG));
        return
    }
})

router.post("/v1/device/details", async (req, res) => {
    try {
        let body = req.body;
        if (!body.loginId) {
            res.send(new CONFIG_APIResponse(400, LOGIN_ID));
            return
        } else if (!body.clientId) {
            res.send(new CONFIG_APIResponse(400, CLIENT_ID));
            return
        } else {
            await axios.post(microservicesurl.configurationpath + 'v1/device/details', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send({ status: 204, msg: "No data available" })
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG))
            });
        }
    } catch (error) {
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG));
        return
    }
})
router.post("/v1/vehicle/createAndUpdate", async (req, res) => {
    let body = req.body;
    let alphaNumericWithoutSPC = /^[a-zA-Z0-9]*$/;
    let alphaNumericWithSPC = /^[a-z\d\-_\s]+$/i;

    try {
        let validateRequest: any = await validateJsonData(body);

        if (validateRequest.status == 200) {

            if (!body.clientid) {
                res.send(new CONFIG_APIResponse(400, CLIENT_ID));
                return;
            } else if (!(body.hasOwnProperty('hasnoTracker'))) {
                res.send(new CONFIG_APIResponse(400, HASNOTRACKER));
                return;
            } else if (!body.alert || !(body.alert.hasOwnProperty('sendAlert'))) {
                res.send(new CONFIG_APIResponse(400, ALERT));
                return;
            } else if (!body.driver || !body.driver.driverName || !body.driver.drivermobile || !body.driver.driverCategeory) {
                res.send(new CONFIG_APIResponse(400, DRIVER));
                return;
            } else if ((!body.hasnoTracker) && (!body.device || !body.device.type || !body.device.deviceModel || !body.device.imei || !body.device.imsi || !body.device.simNo || !body.device.deviceModelName || !body.device.vendordeviceModel || !body.device.deviceStatus || !body.device.typeName || !body.device.vendordeviceModelName)) {
                res.send(new CONFIG_APIResponse(400, DEVICE));
                return;
            } else if (!body.fuel || !body.fuel.type) {
                res.send(new CONFIG_APIResponse(400, FUEL));
                return;
            } else if (!body.vehicle || !body.vehicle.tagName || !body.vehicle.regNo || !body.vehicle.type || !body.vehicle.make || !body.vehicle.model || !body.vehicle.year || !body.vehicle.status) {
                res.send(new CONFIG_APIResponse(400, VEHICLE));
                return;
            } else if (!body.userId) {
                res.send(new CONFIG_APIResponse(400, USER_ID));
                return;
            }
            else if (!body.moduleType) {
                res.send(new CONFIG_APIResponse(400, MODULE_TYPE));
                return;
            }
            else if (!body.adminid) {
                res.send(new CONFIG_APIResponse(400, adminIdErrMsg));
                return;
            }
            // else if (!body.enterprisename) {
            //     res.send(new CONFIG_APIResponse(400, ENTERPRISE));
            //     return;
            // }
            // else if (!body.vehicle.tagName) {
            //     res.send(new CONFIG_APIResponse(400, ASSET_NAME));
            //     return;
            // }
            // else if (!body.vehicle.regNo) {
            //     res.send(new CONFIG_APIResponse(400, REG_NO));
            //     return;
            // }
            // else if (!body.vehicle.type) {
            //     res.send(new CONFIG_APIResponse(400, ASSET_TYPE));
            //     return;
            // }
            // else if (!body.vehicle.make) {
            //     res.send(new CONFIG_APIResponse(400, ASSET_MAKE));
            //     return;
            // }
            // else if (!body.vehicle.model) {
            //     res.send(new CONFIG_APIResponse(400, ASSET_MODEL));
            //     return;
            // }
            // else if (!body.vehicle.year) {
            //     res.send(new CONFIG_APIResponse(400, ASSET_YEAR));
            //     return;
            // } else if (!body.device.imei && !body.hasnoTracker) {
            //     res.send(new CONFIG_APIResponse(400, IMEI_MSG));
            //     return;
            // }
            // else if (!body.device.imsi && !body.hasnoTracker) {
            //     res.send(new CONFIG_APIResponse(400, IMSI_MSG));
            //     return;
            // }
            else if (body.saveMode.toUpperCase() == "MODIFY" && !body.fleetID) {
                res.send(new CONFIG_APIResponse(400, FLEET_ID));
                return;
            }
            else if (body.saveMode.toUpperCase() == "MODIFY" && !body.hasnoTracker && !body.pdid) {
                res.send(new CONFIG_APIResponse(400, PD_ID));
                return;
            }
            else if (!body.saveMode) {
                res.send(new CONFIG_APIResponse(400, SAVEMODE_MSG));
                return;
            } else if (!alphaNumericWithSPC.test(body.vehicle.tagName)) {
                res.send(new CONFIG_APIResponse(400, TAG_VAILD_MSG));
                return
            } else if (!alphaNumericWithoutSPC.test(body.vehicle.regNo)) {
                res.send(new CONFIG_APIResponse(400, REG_VAILD_MSG));
                return
            } else if (body.vehicle.regNo.length <= 3 ||  body.vehicle.regNo.length > 12) {
                res.send(new CONFIG_APIResponse(400, VEHICLE_REG_MIN_MAX));
                return
            } else if (body.vehicle.tagName.length < 1 ||  body.vehicle.tagName.length > 24) {
                res.send(new CONFIG_APIResponse(400, VEHICLE_TAG_MIN_MAX));
                return
            }
            else {
                await axios.post(microservicesurl.configurationpath + 'v1/vehicle/createAndUpdate', body).then(result => {
                    if (result.data.status == 200) {
                        if (body.saveMode.toUpperCase() === "CREATE") {

                            try {
                                let driverName = body.driver.driverName;
                                if (body.driver.driverName.includes("-")) {
                                    driverName = body.driver.driverName.split("-")[0];
                                }

                                let simbody: any = {
                                    "driverid": body.driver.driverID,
                                    "drivermobile": body.driver.drivermobile,
                                    "drivername": driverName,
                                    "enterprisename": body.enterprisename,
                                    "simtrackstatus": 2,
                                    "simtracktype": "N",
                                    "vehiclenumber": body.vehicle.regNo,//"TS07AB12345"
                                    "clientid": body.clientid,
                                    "vehicletagname": body.vehicle.tagName,
                                    "adminid": body.adminid
                                }

                                SIMRegistration_V1(simbody).then(async (response: any) => {
                                    console.log("SIMRegistration Success ");
                                }).catch(ex => {
                                    console.log("Error IN SIMRegistration() : " + ex.message)
                                });

                                res.send(result.data);
                            }
                            catch (ex) {
                                console.log("Error IN SIMRegistration() Out : " + ex.message)
                                res.send(new CONFIG_APIResponse(200, result.data.message + ", Consent Request Failed"));
                            }

                        }
                        else {
                            res.send(result.data);
                        }
                    }
                    else {
                        res.send(result.data);
                    }
                }).catch(error => {
                    res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG))
                });
            }

        } else {
            res.send(validateRequest);
            return
        }
    } catch (error) {
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG));
        return
    }
})

router.post("/v1/vehicle/delete", async (req, res) => {
    try {
        let body = req.body;

        if (!body.IMEIId) {
            res.send(new CONFIG_APIResponse(400, IMEI_MSG));
        } else if (!(body.hasOwnProperty('hasnoTracker'))) {
            res.send(new CONFIG_APIResponse(400, HASNOTRACKER));
            return;
        } else if (!body.pdid) {
            res.send(new CONFIG_APIResponse(400, PD_ID));
            return;
        } else if (!body.fleetID) {
            res.send(new CONFIG_APIResponse(400, FLEET_ID));
            return;
        } else if (!body.loginId) {
            res.send(new CONFIG_APIResponse(400, LOGIN_ID));
            return;
        } else {
            await axios.post(microservicesurl.configurationpath + 'v1/vehicle/delete', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send({ status: 204, msg: "No data available" })
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG))
            });
        }
    } catch (error) {
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG));
        return
    }
})

router.post("/v1/vehicle/details", async (req, res) => {
    try {
        let body = req.body;

        if (!body.loginId) {
            res.send(new CONFIG_APIResponse(400, LOGIN_ID));
            return
        } else if (!body.clientId) {
            res.send(new CONFIG_APIResponse(400, CLIENT_ID));
            return
        } else {
            await axios.post(microservicesurl.configurationpath + 'v1/vehicle/details', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send({ status: 204, msg: "No data available" })
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG))
            });
        }
    } catch (error) {
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG));
        return
    }
})

router.post("/v1/vehicle/oemdata", async (req, res) => {
    let body = req.body;

    try {

        // if (!body.vType) {
        //     res.send(new CONFIG_APIResponse(400, VEHICLE_TYPE));
        // } else if (!body.vManufacturer) {
        //     res.send(new CONFIG_APIResponse(400, VEHICLE_MANUFACTURER));
        // } else if (!body.vModel) {
        //     res.send(new CONFIG_APIResponse(400, VEHICLE_MODEL));
        // }
        // else {
        await axios.post(microservicesurl.configurationpath + 'v1/vehicle/oemdata', body).then(result => {
            if (result) {
                res.send(result.data);
            }
            else {
                res.send(new CONFIG_APIResponse(204, NO_DATA_AVL_MSG))
            }
        }).catch(error => {
            console.log(error)
            res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG))
        });
        // }
    } catch (error) {
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_MSG))
    }

});

router.post("/v1/createContractor", async (req, res) => {
    let body = req.body;
    try {
        let validateRequest: any = await validateJsonData(body);
        if (validateRequest.status == 200) {
            let emailrex = new RegExp("^[\\w!#$%&'*+/=?`{|}~^-]+(?:\\.[\\w!#$%&'*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}$");
            let mobileno = new RegExp('^[5-9][0-9]*$');
            let validName = new RegExp('^[a-zA-Z]+$');
            let pinno = new RegExp('^[1-9][0-9]{5}$');
            const latRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
            const lngRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
            let taxno = new RegExp('^[0-9]{2}');
            let taxnum = new RegExp('^[a-zA-Z0-9]+$');

            var reg = new RegExp('^[0-9]+$');



            var taxNumber = body.taxNo ? body.taxNo.split(" ") : "";
            var taxnumb = taxNumber[0] + taxNumber[1]

            if (taxnumb && !taxnumb.match(taxno)) {
                res.send(new CONFIG_APIResponse(400, TAXNUM_VALIDATE_MSG));
            }
            //var ip_info = get_ip(req);
            // if (!body.address1) {
            //     res.send(new CONFIG_APIResponse(400, address1Msg));
            // }
            // else if (!body.address2) {
            //     res.send(new CONFIG_APIResponse(400,address2Msg));
            // }
            // else if (!body.city) {
            //     res.send(new CONFIG_APIResponse(400, cityMsg));
            // }
            // else if (!body.countryID) {
            //     res.send(new CONFIG_APIResponse(400, countryMsg));
            // }
            if (!body.userId) {
                res.send(new CONFIG_APIResponse(400, UID_ERR_MSG));
            }
            else if (!body.fullName) {
                res.send(new CONFIG_APIResponse(400, fullnameMsg));
            } else if (!body.fullName.match(validName)) {
                res.send(new APIError(400, NameValidMsg))
            }
            // else if (!body.latitude) {
            //     res.send(new CONFIG_APIResponse(400, latMsg));
            // }
            // else if (!body.longitude) {
            //     res.send(new CONFIG_APIResponse(400, longMsg));
            // }
            else if (body.latitude && !latRegex.exec(body.latitude)) {
                res.send(new ResponseWithObject(400, LOCATION_LATITUDE_MSG));
            }
            else if (body.longitude && !lngRegex.exec(body.longitude)) {
                res.send(new ResponseWithObject(400, LOCATION_LONGIITUDE_MSG));
            }
            else if (!body.mobileNumber) {
                res.send(new CONFIG_APIResponse(400, mobileMsg));
            }
            else if (body.mobileNumber.length != 10) {
                res.send(new CONFIG_APIResponse(400, mobLengthMsg));
            }

            else if (body.mobileNumber && !body.mobileNumber.match(mobileno)) {
                res.send(new APIError(400, NUMBER_VALIDATE_MSG));
            }
            else if (body.mailId && !body.mailId.match(emailrex)) {
                res.send(new CONFIG_APIResponse(400, MAILID_VALIDATE_MSG));
            }
            // else if (!body.pincode) {
            //     res.send(new CONFIG_APIResponse(400, pincodeMsg));
            // }
            else if (body.pincode && body.pincode.length != 6) {
                res.send(new CONFIG_APIResponse(400, pinLengthMsg));
            }
            else if (body.pincode && !body.pincode.match(pinno)) {
                res.send(new CONFIG_APIResponse(400, PINCODE_VALIDATE_MSG));
            }
            // else if (!body.stateID) {
            //     res.send(new CONFIG_APIResponse(400, stateMsg));
            // }
            else if (!body.tagID) {
                res.send(new CONFIG_APIResponse(400, tagIdMsg));
            }
            // else if (!body.taxID) {
            //     res.send(new CONFIG_APIResponse(400, taxIdMsg));
            // }
            // else if (!body.taxNo) {
            //     res.send(new CONFIG_APIResponse(400, taxNoMsg));
            // }
            else if (body.taxNo && body.taxNo.length != 15) {
                res.send(new CONFIG_APIResponse(400, TAXNUMBER_VALIDATE_MSG));
            }
            else if (body.taxNo && !body.taxNo.match(taxnum)) {
                res.send(new CONFIG_APIResponse(400, "Invalid tax number"));
            }
            // else if (!body.erpCode) {
            //     res.send(new CONFIG_APIResponse(400, "ERP Code is required"));
            // }
            // else if (!body.erpCode && body.erpCode.length > 20) {
            //     res.send(new CONFIG_APIResponse(400, erpLengthMsg));
            // }
            else {
                //insertContractors
                if (body.hasOwnProperty('mailId')) {
                    // let emailCheck = body.mailId.split("")[0];

                    // if (emailCheck.match(reg) !== null) {
                    //     res.send(new APIError(400, MAILID_VALIDATE_MSG));
                    //     return;
                    // }
                    if (body.mailId && !body.mailId.match(emailrex)) {
                        res.send(new CONFIG_APIResponse(400, MAILID_VALIDATE_MSG));
                        return;
                    }
                }
                await axios.post(microservicesurl.configurationpath + 'getContractorDropDownData').then(result => {
                    if (result.data) {
                        var findTagId = result.data.ContractorKindDetails.filter(i => i.LTV_Id == body.tagID)
                        var findTaxId = []
                        var findCountryId = []
                        var findStateId = []
                        if (body.taxID) {
                            findTaxId = result.data.TaxDetails.filter(i => i.LTV_Id == body.taxID)
                        }
                        if (body.countryID) {
                            findCountryId = result.data.CountryDetails.filter(i => i.CountryID == body.countryID)
                        }
                        if (body.stateID) {
                            findStateId = result.data.StateDetails.filter(i => i.StateID == body.stateID)
                        }
                        //console.log(findTagId, findTaxId, findCountryId, findStateId)
                        if (!findTagId.length) {
                            res.send(new Response(204, tagIdErrMsg))
                            return false;
                        } else if (body.taxID && !findTaxId.length) {
                            res.send(new Response(204, taxIdErrMsg))
                            return false;
                        } else if (body.countryID && !findCountryId.length) {
                            res.send(new Response(204, countryIdErrMsg))
                            return false;
                        } else if (body.stateID && !findStateId.length) {
                            res.send(new Response(204, stateIdErrMsg))
                            return false;
                        }
                    }
                    else {
                        res.send(new Response(204, NO_DATA_AVL_MSG))
                    }
                })
                await axios.post(microservicesurl.configurationpath + 'v1/insertContractors', body).then(async result => {
                    if (result.data) {
                        res.send(result.data);
                    }
                    else {
                        res.send(new CONFIG_APIResponse(204, NO_DATA_AVL_MSG))
                    }
                }).catch(error => {
                    res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_ERR_MSG))
                });
            }
        }
        else {
            res.send(validateRequest);
            return
        }
    }
    catch (err) {
        loggerDetails.logger.error(" sourceIP : " + ip + "," + " ContractorName : " + body.fullName + "," + " time : " + dateFormat(new Date(), "yyyy-mm-dd h:MM:ss") + "," + " status : notCreated , " + " Exception Message : " + err.message);
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_ERR_MSG));
    }
})
router.post("/v1/updateContractor", async (req, res) => {
    let body = req.body;
    try {
        let validateRequest: any = await validateJsonData(body);
        if (validateRequest.status == 200) {
            let emailrex = new RegExp("^[\\w!#$%&'*+/=?`{|}~^-]+(?:\\.[\\w!#$%&'*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}$");
            let mobileno = new RegExp('^[5-9][0-9]*$');
            let validName = new RegExp('^[a-zA-Z]+$');
            let pinno = new RegExp('^[1-9][0-9]{5}$');
            const latRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
            const lngRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
            let taxno = new RegExp('^[0-9]{2}');
            let taxnum = new RegExp('^[a-zA-Z0-9]+$');
            var reg = new RegExp('^[0-9]+$');
            let erpnum = new RegExp('^[a-zA-Z0-9]+$');

            var taxNumber = body.taxNo ? body.taxNo.split(" ") : "";
            var taxnumb = taxNumber[0] + taxNumber[1]

            if (taxnumb && !taxnumb.match(taxno)) {
                res.send(new CONFIG_APIResponse(400, TAXNUM_VALIDATE_MSG));
            }
            //var ip_info = get_ip(req);
            // if (!body.address1) {
            //     res.send(new CONFIG_APIResponse(400, address1Msg));
            // }
            // else if (!body.address2) {
            //     res.send(new CONFIG_APIResponse(400, address2Msg));
            // }
            // else if (!body.city) {
            //     res.send(new CONFIG_APIResponse(400, cityMsg));
            // }
            // else if (!body.countryID) {
            //     res.send(new CONFIG_APIResponse(400, countryMsg));
            // }
            if (!body.userId) {
                res.send(new CONFIG_APIResponse(400, UID_ERR_MSG));
            }
            else if (!body.fullName) {
                res.send(new CONFIG_APIResponse(400, fullnameMsg));
            } else if (!body.fullName.match(validName)) {
                res.send(new APIError(400, NameValidMsg))
            }
            // else if (!body.latitude) {
            //     res.send(new CONFIG_APIResponse(400, latMsg));
            // }
            // else if (!body.longitude) {
            //     res.send(new CONFIG_APIResponse(400, longMsg));
            // }
            else if (body.latitude && !latRegex.exec(body.latitude)) {
                res.send(new ResponseWithObject(400, LOCATION_LATITUDE_MSG));
            }
            else if (body.longitude && !lngRegex.exec(body.longitude)) {
                res.send(new ResponseWithObject(400, LOCATION_LONGIITUDE_MSG));
            }
            else if (!body.mobileNumber) {
                res.send(new CONFIG_APIResponse(400, mobileMsg));
            }
            else if (body.mobileNumber.length != 10) {
                res.send(new CONFIG_APIResponse(400, mobLengthMsg));
            }
            else if (body.mailId && !body.mailId.match(emailrex)) {
                res.send(new CONFIG_APIResponse(400, MAILID_VALIDATE_MSG));
            }

            else if (body.mobileNumber && !body.mobileNumber.match(mobileno)) {
                res.send(new APIError(400, NUMBER_VALIDATE_MSG));
            }
            // else if (!body.pincode) {
            //     res.send(new CONFIG_APIResponse(400, pincodeMsg));
            // }
            else if (body.pincode && body.pincode.length != 6) {
                res.send(new CONFIG_APIResponse(400, pinLengthMsg));
            }
            else if (body.pincode && !body.pincode.match(pinno)) {
                res.send(new CONFIG_APIResponse(400, PINCODE_VALIDATE_MSG));
            }
            // else if (!body.stateID) {
            //     res.send(new CONFIG_APIResponse(400, stateMsg));
            // }
            else if (!body.tagID) {
                res.send(new CONFIG_APIResponse(400, tagIdMsg));
            }
            // else if (!body.taxID) {
            //     res.send(new CONFIG_APIResponse(400, taxIdMsg));
            // }
            // else if (!body.taxNo) {
            //     res.send(new CONFIG_APIResponse(400, taxNoMsg));
            // }
            else if (body.taxNo && body.taxNo.length != 15) {
                res.send(new CONFIG_APIResponse(400, TAXNUMBER_VALIDATE_MSG));
            }
            else if (body.taxNo && !body.taxNo.match(taxnum)) {
                res.send(new CONFIG_APIResponse(400, "Invalid tax number"));
            }
            else if (!body.contractorID) {
                res.send(new CONFIG_APIResponse(400, conidMsg));
            }
            // else if (!body.erpCode) {
            //     res.send(new CONFIG_APIResponse(400, erpcodeMsg));
            // }
            // else if (body.erpCode && !body.erpCode.match(erpnum)) {
            //     res.send(new APIError(400, "Please Enter valid ERPCode"));
            //     return false;
            // }
            // else if ( body.erpCode &&!validate(body.erpCode)) {
            //     res.send(new APIError(202, "ERPCode min length 0 and max 20"))
            //     return false;
            // }
            // else if (body.erpcode && body.erpcode.length > 20) {
            //     res.send(new CONFIG_APIResponse(400, erpLengthMsg));
            // }

            else {
                //insertContractors
                if (body.hasOwnProperty('mailId')) {
                    // let emailCheck = body.mailId.split("")[0];

                    // if (emailCheck.match(reg) !== null) {
                    //     res.send(new APIError(400, MAILID_VALIDATE_MSG));
                    //     return;
                    // }
                    if (body.mailId && !body.mailId.match(emailrex)) {
                        res.send(new CONFIG_APIResponse(400, MAILID_VALIDATE_MSG));
                        return;
                    }
                }
                await axios.post(microservicesurl.configurationpath + 'getContractorDropDownData').then(result => {
                    if (result.data) {
                        var findTagId = result.data.ContractorKindDetails.filter(i => i.LTV_Id == body.tagID)
                        var findTaxId = []
                        var findCountryId = []
                        var findStateId = []
                        if (body.taxID) {
                            findTaxId = result.data.TaxDetails.filter(i => i.LTV_Id == body.taxID)
                        }
                        if (body.countryID) {
                            findCountryId = result.data.CountryDetails.filter(i => i.CountryID == body.countryID)
                        }
                        if (body.stateID) {
                            findStateId = result.data.StateDetails.filter(i => i.StateID == body.stateID)
                        }
                        //console.log(findTagId, findTaxId, findCountryId, findStateId)
                        if (!findTagId.length) {
                            res.send(new Response(204, tagIdErrMsg))
                            return false;
                        } else if (body.taxID && !findTaxId.length) {
                            res.send(new Response(204, taxIdErrMsg))
                            return false;
                        } else if (body.countryID && !findCountryId.length) {
                            res.send(new Response(204, countryIdErrMsg))
                            return false;
                        } else if (body.stateID && !findStateId.length) {
                            res.send(new Response(204, stateIdErrMsg))
                            return false;
                        }
                    }
                    else {
                        res.send(new Response(204, NO_DATA_AVL_MSG))
                    }
                })
                await axios.post(microservicesurl.configurationpath + 'v1/updateContractors', body).then(result => {
                    if (result.data) {
                        res.send(result.data);
                    }
                    else {
                        res.send(new CONFIG_APIResponse(204, NO_DATA_AVL_MSG))
                    }
                }).catch(error => {
                    res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_ERR_MSG))
                });
            }
        }
        else {
            res.send(validateRequest);
            return
        }
    }
    catch (err) {
        loggerDetails.logger.error(" sourceIP : " + ip + "," + " ContractorName : " + body.fullName + "," + " time : " + dateFormat(new Date(), "yyyy-mm-dd h:MM:ss") + "," + " status : notCreated , " + " Exception Message : " + err.message);
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_ERR_MSG));
    }
})

function validate(value) {
    //var reg = (/^[a-zA-Z][a-zA-Z0-9 ]+$/);
    var len = {min:0,max:20};
    // if (!reg.test(value)) {
    //     console.log('didn\'t match regex');
    //     return false;
    //   }
    
      if (value.length < len.min || value.length > len.max) {
        console.log('incorrect length: ' + value);
        return false;
      }
    
      console.log('correct length: ' + value);
      return true;
  }





// Create Driver <==== START =========>
router.post("/v1/createDriver", async (req, res) => {
    let body = req.body;
    try {
        let validateRequest: any = await validateJsonData(body);
        if (validateRequest.status == 200) {
            let mobileReg = /^[5-9]\d{9}$/;
            let emailrex = new RegExp("^[\\w!#$%&'*+/=?`{|}~^-]+(?:\\.[\\w!#$%&'*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}$");
            let validName = /^[a-zA-Z ]+$/;

            let numRegex = new RegExp(/^-?[0-9]+(\.[0-9]*){0,1}$/g);

            let alphanumeric = new RegExp(/^[a-zA-Z][a-zA-Z0-9 ]+$/);

            var reg = new RegExp('^[0-9]+$');

            let emailCheck = body.email.split("")[0];

            if (emailCheck.match(reg) !== null) {
                res.send(new APIError(400, MAILID_VALIDATE_MSG));
                return;
            }

            if (body.driverId && body.driverId != "") {
                res.send(new Response(400, DRIVER_ID_EMPTY));
            }
            if (!body.userid) {
                res.send(new Response(400, USER_ID));
            }
            else if (!body.adminid) {
                res.send(new Response(400, adminIdErrMsg));
            }
            else if (!body.dname) {
                res.send(new Response(400, nameErrMsg));
            }
            else if (!body.dname.match(validName)) {
                res.send(new Response(400, INVALID_DRIVER_NAME))
                return
            }
            else if (!body.dmno) {
                res.send(new Response(400, mnoErrMsg));
            }
            else if (!body.pcode) {
                res.send(new Response(400, PASSCODEMESSAGE));
            }
            else if (body.pcode && (!body.pcode.match(numRegex) || body.pcode.length != 6)) {
                res.send(new Response(400, PASSCODEERRORMESSAGE));
            }
            // else if (body.dmno && (!body.dmno.match(numRegex) || body.dmno.length != 10)) {
            //     res.send(new Response(400, PHONE_VALIDATE_MSG));
            // }
            else if (!mobileReg.test(body.dmno)) {
                res.send(new Response(400, PHONE_VALIDATE_MSG));
                return
            }
            else if (body.email && !body.email.match(emailrex)) {
                res.send(new APIError(400, MAILID_VALIDATE_MSG));
            }
            else if (body.aadhar) {
                if (body.aadhar.length != 12 || !body.aadhar.match(numRegex)) {
                    res.send(new APIError(400, AADHAR_NUMBER_MSG));
                }
            }
            if (body.pan) {
                if (body.pan.length != 10 || !alphanumeric.exec(body.pan)) {
                    res.send(new APIError(400, PAN_NUMBER_MSG));
                }
            }

            if (body.licenseno) {
                if (!alphanumeric.exec(body.licenseno)) {
                    res.send(new APIError(400, LICENSE_NUMBER_MSG));
                }
            }

            if (body.badgeno) {
                if (!alphanumeric.exec(body.badgeno)) {
                    res.send(new APIError(400, BADGE_NUMBER_MSG));
                }
            }

            let aadhar: any;
            let pan: any;
            let passcode: any;

            if (body.aadhar) {
                aadhar = await setEncryptString(body.aadhar);//converting text to encrpt 
                body.aadhar = aadhar;
            }
            else {
                body.aadhar = null;
            }
            if (body.pan) {
                pan = await setEncryptString(body.pan); //converting text to encrpt
                body.pan = pan;
            }
            else {
                body.pan = null;
            }
            if (body.pcode) {
                passcode = await getEncryptPassword(body.pcode); //converting text to encrpt
                body.pcode = passcode;
            }
            else {
                body.pcode = null;
            }

            let jsonbody = body;
            await axios.post(microservicesurl.configurationpath + 'v1/createDriver', jsonbody).then(async result => {
                if (result) {

                    if (result.data.status == 200) {
                        let trackerId = result.data.TrackerID;
                        let enterpriseId = result.data.IOT_UserID;
                        body.driverId = result.data.driverId;
                        await axios.post(microservicesurl.configurationpath + 'v1/createDriverinmongo', body).then(resp => {
                            res.send(result.data);
                        }).catch(error => {
                            res.send(new Response(205, SOMETHING_WENT_MSG))
                        });
                        let deviceReq = {
                            "data": {
                                "enterprise_id": enterpriseId,
                                "devices": [
                                    {
                                        "model_id": "AT01V12345",
                                        "onboarded_platform": "JHS",
                                        "device_id": {
                                            "imei": trackerId.toString(),
                                            "jm_pdid": trackerId.toString()
                                        }
                                    }
                                ]
                            }
                        }
                      
                        let jmtiurl = microservicesurl.jmti_url + 'enterprises/devices/v1/add';
                        let jmti_api_key = microservicesurl.jmti_api_key.toString();
                        let deviceaddbody = deviceReq
        
                        const adddeviceresponse = await addDeviceinJMTI(jmtiurl, jmti_api_key, deviceaddbody);
                        if (adddeviceresponse && adddeviceresponse?.data && adddeviceresponse?.data?.status && adddeviceresponse?.data?.status == 'success') {
                            console.log("addDeviceinJMTI :-  Added Successfully in JMTI device add API || " + " Date " + moment(new Date()).format("DD/MM/YYYY hh:mm:ss A"));
                            //res.send(adddeviceresponse);
                        } else {
                            console.log("addDeviceinJMTI :-  Unable to Add Device in JMTI : || " + " Date " + moment(new Date()).format("DD/MM/YYYY hh:mm:ss A"));
                            let msg = adddeviceresponse?.errors[0]?.error_details?.invalid_name[0]?.jm_pdid
                            let status = adddeviceresponse?.errors[0]?.error_code
                            let response: any = {
                                "errorResponse": adddeviceresponse,
                                "message": msg,
                                "status": status
                            }                           
                        }
                    }
                    else {
                        res.send(result.data);
                    }

                }
                else {
                    res.send(new Response(205, SOMETHING_WENT_MSG));
                }
            }).catch(error => {
                res.send(new Response(205, SOMETHING_WENT_MSG));
            });
        }
        else {
            res.send(validateRequest);
            return
        }

    } catch (error) {
        res.send(new Response(205, SOMETHING_WENT_MSG));
    }
});
// Create Driver <==== END =========>

// Update Driver Details <==== START =========>
router.post("/v1/updateDriver", async (req, res) => {
    let body = req.body;
    try {
        let validateRequest: any = await validateJsonData(body);
        if (validateRequest.status == 200) {
            let validName = /^[a-zA-Z ]+$/;
            let emailrex = new RegExp("^[\\w!#$%&'*+/=?`{|}~^-]+(?:\\.[\\w!#$%&'*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}$");

            let numRegex = new RegExp(/^-?[0-9]+(\.[0-9]*){0,1}$/g);
            let alphanumeric = new RegExp(/^[a-zA-Z][a-zA-Z0-9 ]+$/)
            var reg = new RegExp('^[0-9]+$');

            let emailCheck = body.email.split("")[0];

            if (emailCheck.match(reg) !== null) {
                res.send(new APIError(400, MAILID_VALIDATE_MSG));
                return;
            }

            if (!body.driverId) {
                res.send(new Response(400, dvrIdErrMsg));
            }
            if (!body.userid) {
                res.send(new Response(400, USER_ID));
            }
            else if (!body.adminid) {
                res.send(new Response(400, adminIdErrMsg));
            }
            else if (!body.dname) {
                res.send(new Response(400, nameErrMsg));
            }
            else if (!body.dname.match(validName)) {
                res.send(new Response(400, INVALID_DRIVER_NAME))
                return
            }
            else if (!body.pcode) {
                res.send(new Response(400, PASSCODEMESSAGE));
            }
            else if (body.pcode && (!body.pcode.match(numRegex) || body.pcode.length != 6)) {
                res.send(new Response(400, PASSCODEERRORMESSAGE));
            }
            else if (body.email && !body.email.match(emailrex)) {
                res.send(new APIError(400, MAILID_VALIDATE_MSG));
            }
            else if (body.aadhar) {
                if (body.aadhar.length != 12 || !body.aadhar.match(numRegex)) {
                    res.send(new APIError(400, AADHAR_NUMBER_MSG));
                }
            }
            if (body.pan) {
                if (body.pan.length != 10 || !alphanumeric.exec(body.pan)) {
                    res.send(new APIError(400, PAN_NUMBER_MSG));
                }
            }

            if (body.licenseno) {
                if (!alphanumeric.exec(body.licenseno)) {
                    res.send(new APIError(400, LICENSE_NUMBER_MSG));
                }
            }

            if (body.badgeno) {
                if (!alphanumeric.exec(body.badgeno)) {
                    res.send(new APIError(400, BADGE_NUMBER_MSG));
                }
            }

            let aadhar: any;
            let pan: any;
            let passcode: any;

            if (body.aadhar) {
                aadhar = await setEncryptString(body.aadhar);//converting text to encrpt 
                body.aadhar = aadhar;
            }
            else {
                body.aadhar = null;
            }
            if (body.pan) {
                pan = await setEncryptString(body.pan); //converting text to encrpt
                body.pan = pan;
            }
            else {
                body.pan = null;
            }
            if (body.pcode) {
                passcode = await getEncryptPassword(body.pcode); //converting text to encrpt
                body.pcode = passcode;
            }
            else {
                body.pcode = null;
            }

            let jsonbody = body;
            await axios.post(microservicesurl.configurationpath + 'v1/updateDriver', jsonbody).then(async result => {
                if (result) {

                    if (result.data.status == 200) {
                        body.driverId = result.data.driverId;
                        await axios.post(microservicesurl.configurationpath + 'v1/updateDriverinmongo', body).then(resp => {
                            res.send(result.data);
                        }).catch(error => {
                            res.send(new Response(205, SOMETHING_WENT_MSG))
                        });
                    }
                    else {
                        res.send(result.data);
                    }

                }
                else {
                    res.send(new Response(205, SOMETHING_WENT_MSG));
                }
            }).catch(error => {
                res.send(new Response(205, SOMETHING_WENT_MSG));
            });

        }
        else {
            res.send(validateRequest);
            return
        }

    } catch (error) {
        res.send(new Response(205, SOMETHING_WENT_MSG));
    }
});
// Update Driver Details <==== END =========>

// DELETE Driver <==== START =========>
router.post('/v1/deleteDriver', async (req, res) => {
    let body = req.body;
    try {
        if (!body.userid) {
            res.send(new Response(400, USER_ID));
        }
        else if (!body.driverId) {
            res.send(new Response(400, dvrIdErrMsg));
        }
        else {
            await axios.post(microservicesurl.configurationpath + 'v1/deleteDriver', body).then(async result => {
                if (result) {
                    if (result.data.status == 200) {
                        await axios.post(microservicesurl.configurationpath + 'v1/deleteDriverMongo', body).then(resp => {
                            res.send(result.data);
                        }).catch(error => {
                            res.send(new Response(400, SOMETHING_WENT_ERR_MSG))
                        });
                    }
                    else {
                        res.send(result.data);
                    }
                }
                else {
                    res.send(new Response(400, errdelMsg))
                }
            }).catch(error => {
                res.send(new Response(205, SOMETHING_WENT_ERR_MSG))
            });
        }
    } catch (error) {
        res.send(new Response(205, SOMETHING_WENT_ERR_MSG));
    }

})
// DELETE Driver <==== END =========>

// getting Driver List <==== START =========>
router.post('/v1/getDriverList', async (req, res) => {
    try {
        let body = req.body;
        if (!body.clientID) {
            res.send(new CONFIG_APIResponse(400, CLIENT_ID))
        }
        else if (!body.userid) {
            res.send(new CONFIG_APIResponse(400, USER_ID))
        }
        else if (!body.size) {
            res.send(new CONFIG_APIResponse(400, pageSizeMsg))
        }
        else {
            await axios.post(microservicesurl.configurationpath + 'v1/getDriverList', body).then(result => {
                if (result) {
                    if (result.data.status == 200) {
                        res.send(result.data);
                    }
                    else {
                        res.send(new Response(400, nodataMsg))
                    }
                }
                else {
                    res.send(result.data);
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHINGMSG))
            });
        }

    } catch (error) {
        res.send(new CONFIG_APIResponse(205, SOMETHINGMSG));
    }

});
// getting Driver List <==== END =========>

// getting Contractor Details <==== START =========>
router.post("/v1/getOrderDropDown", async (req, res) => {
    try {
        let body = req.body;
        if (!body.userID) {
            res.send(new CONFIG_APIResponse(400, USER_ID));
        }
        else if (!body.clientID) {
            res.send(new CONFIG_APIResponse(400, CLIENT_ID));
        } else {
            await axios.post(microservicesurl.configurationpath + 'v1/getOrderDropDown', body).then(result => {
                if (result.data) {
                    res.send(result.data);
                }
                else {
                    res.send(new CONFIG_APIResponse(204, NO_DATA_AVL_MSG))
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_ERR_MSG))
            });
        }
    }
    catch (error) {
        let response: any = new CONFIG_APIResponse(205, SOMETHING_WENT_ERR_MSG);
        response['fleetContractorList'] = [];
        res.send(response);
    }
});
// getting Contractor Details <==== END =========>

// Customer Related API's <==== START =========>
router.post('/createOrgCustLocation', async (req, res) => {
    try {
        req.body.savemode = "create"
        let body = req.body;
        let emailrex = new RegExp("^[\\w!#$%&'*+/=?`{|}~^-]+(?:\\.[\\w!#$%&'*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}$");
        let mobileno = new RegExp('^[5-9][0-9]*$');
        let validName = new RegExp('^[a-zA-Z0-9 ]+$');
        let custName = new RegExp('^[a-zA-Z]+$');
        var reg = new RegExp('^[0-9]+$');
        const latRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
        const lngRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
        let splitName = body.orgName.split("")[0];
        let emailCheckoforgEmail = body.orgEmail.split("")[0];
        let emailCheckofcustEmail = body.custemail.split("")[0];
        if (emailCheckoforgEmail&&emailCheckoforgEmail.match(reg) !== null) {
            res.send(new APIError(400, MAILID_VALIDATE_MSG));
            return;
        }
        if (emailCheckofcustEmail&&emailCheckofcustEmail.match(reg) !== null) {
            res.send(new APIError(400, MAILID_VALIDATE_MSG));
            return;
        }
        if (!body.C_ID) {
            res.send(new APIError(400, CLIENT_ID))
        }
        else if (splitName.match(reg) !== null) {
            res.send(new APIError(400, orgNameValidMsg))
        }
        else if (!body.orgName.match(validName)) {
            res.send(new APIError(400, orgNameValidMsg))
        }

        else if (typeof body.geotrip !== "boolean") {
            res.send(new APIError(400, geoTripErrMsg))
        }

        else if (!body.Longitude) {
            res.send(new APIError(400, STOP_LONGITUDE_MSG));
        }

        else if (!body.Lattitude) {
            res.send(new APIError(400, STOP_LATITUDE_MSG));
        }
        else if (!latRegex.exec(body.Lattitude)) {
            res.send(new APIError(400, LOCATION_LATITUDE_MSG));
        }
        else if (!lngRegex.exec(body.Longitude)) {
            res.send(new APIError(400, LOCATION_LONGIITUDE_MSG));
        }
        else if (!body.orgName) {
            res.send(new APIError(400, orgName))
        }

        else if (!body.addr) {
            res.send(new APIError(400, addressErrMsg))
        }

        else if (!body.State) {
            res.send(new APIError(400, stateErrMsg))
        }
        else if (body.orgEmail && !body.orgEmail.match(emailrex)) {
            res.send(new APIError(400, MAILID_VALIDATE_MSG));
            return;

        }
        else if (body.orgContract && body.orgContract.length != 10) {
            res.send(new APIError(400, mobileLengthErrMsg));
        }
        else if (body.orgContract && !body.orgContract.match(mobileno)) {
            res.send(new APIError(400, orgmobileErrMsg));
        }
        else if (!body.custname) {
            res.send(new APIError(400, custNameErrMsg))
        }
        else if (!body.custname.match(custName)) {
            res.send(new APIError(400, custNameValidMsg))
        }
        else if (!body.userId) {
            res.send(new APIError(400, USER_ID))
        } else if (body.custemail && !body.custemail.match(emailrex)) {
            res.send(new APIError(400, MAILID_VALIDATE_MSG));
        } else if (body.custmno && body.custmno.length != 10) {
            res.send(new APIError(400, mobileLengthErrMsg));
        } else if (body.custmno && !body.custmno.match(mobileno)) {
            res.send(new APIError(400, mobileErrMsg));
        }
        else if (!body.locname) {
            res.send(new APIError(400, locationErrMsg))
        }
        // else if (!body.erpCode) {
        //     res.send(new CONFIG_APIResponse(400, erpcodeMsg));
        // }
        // else if (body.erpcode && body.erpcode.length > 20) {
        //     res.send(new CONFIG_APIResponse(400, erpLengthMsg));
        // }
        else {
            await axios.post(microservicesurl.configurationpath + 'createOrgCustLocation', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send(new Response(400, nodataMsg))
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHINGMSG))
            });
        }

    } catch (error) {
        res.send(new APIError(205, SOMETHINGMSG));
    }

});
router.post('/updateOrgCustLocation', async (req, res) => {
    try {
        req.body.savemode = "modify"
        let body = req.body;
        let emailrex = new RegExp("^[\\w!#$%&'*+/=?`{|}~^-]+(?:\\.[\\w!#$%&'*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}$");
        let mobileno = new RegExp('^[5-9][0-9]*$');
        let validName = new RegExp('^[a-zA-Z0-9 ]+$');
        let custName = new RegExp('^[a-zA-Z]+$');
        const latRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
        const lngRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
        var reg = new RegExp('^[0-9]+$');
        let emailCheckoforgEmail = body.orgEmail.split("")[0];
        let emailCheckofcustEmail = body.custemail.split("")[0];
        if (emailCheckoforgEmail&&emailCheckoforgEmail.match(reg) !== null) {
            res.send(new APIError(400, MAILID_VALIDATE_MSG));
            return;
        }
        if (emailCheckofcustEmail&&emailCheckofcustEmail.match(reg) !== null) {
            res.send(new APIError(400, MAILID_VALIDATE_MSG));
            return;
        }
        let splitName = body.orgName.split("")[0];
        if (!body.C_ID) {
            res.send(new APIError(400, CLIENT_ID))
        }
        else if (splitName.match(reg) !== null) {
            res.send(new APIError(400, orgNameValidMsg))
        }
        else if (!body.Longitude) {
            res.send(new APIError(400, STOP_LONGITUDE_MSG));
        }
        else if (!body.Lattitude) {
            res.send(new APIError(400, STOP_LATITUDE_MSG));
        }
        else if (!body.addr) {
            res.send(new APIError(400, addressErrMsg))
        }
        else if (!body.geotrip) {
            res.send(new APIError(400, geoTripErrMsg))
        }
        else if (!body.State) {
            res.send(new APIError(400, stateErrMsg))
        }
        else if (!latRegex.exec(body.Lattitude)) {
            res.send(new APIError(400, LOCATION_LATITUDE_MSG));
        }
        else if (!lngRegex.exec(body.Longitude)) {
            res.send(new APIError(400, LOCATION_LONGIITUDE_MSG));
        }
        else if (!body.orgName) {
            res.send(new APIError(400, orgName))
        }
        else if (!body.orgName.match(validName)) {
            res.send(new APIError(400, orgNameValidMsg))
        }
        else if (body.orgEmail && !body.orgEmail.match(emailrex)) {
            res.send(new APIError(400, MAILID_VALIDATE_MSG));
        }
        else if (body.orgContract && body.orgContract.length != 10) {
            res.send(new APIError(400, mobileLengthErrMsg));
        }
        else if (body.orgContract && !body.orgContract.match(mobileno)) {
            res.send(new APIError(400, orgmobileErrMsg));
        }
        else if (!body.custname) {
            res.send(new APIError(400, custNameErrMsg))
        }
        else if (!body.custname.match(custName)) {
            res.send(new APIError(400, custNameValidMsg))
        }
        else if (!body.CUST_ID) {
            res.send(new APIError(400, cusIdErrMsg))
        } else if (!body.userId) {
            res.send(new APIError(400, USER_ID))
        } else if (body.custemail && !body.custemail.match(emailrex)) {
            res.send(new APIError(400, MAILID_VALIDATE_MSG));
        } else if (body.custmno && body.custmno.length != 10) {
            res.send(new APIError(400, mobileLengthErrMsg));
        } else if (body.custmno && !body.custmno.match(mobileno)) {
            res.send(new APIError(400, mobileErrMsg));
        }
        else if (!body.locname) {
            res.send(new APIError(400, locationErrMsg))
        }
        // else if (!body.erpCode) {
        //     res.send(new CONFIG_APIResponse(400, erpcodeMsg));
        // }
        // else if (body.erpcode && body.erpcode.length > 20) {
        //     res.send(new CONFIG_APIResponse(400, erpLengthMsg));
        // }
        else {
            await axios.post(microservicesurl.configurationpath + 'updateOrgCustLocation', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send(new Response(400, nodataMsg))
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHINGMSG))
            });
        }

    } catch (error) {
        res.send(new APIError(205, SOMETHINGMSG));
    }
})
router.post('/deleteOrgCustLocation', async (req, res) => {
    try {
        let body = req.body;
        if (!body.C_ID) {
            res.send(new APIError(400, CLIENT_ID))
        } else if (!body.ORG_ID) {
            res.send(new APIError(400, orgIdErrMsg))
        }
        else if (!body.CUST_ID) {
            res.send(new APIError(400, cusIdErrMsg))
        } else if (!body.userId) {
            res.send(new APIError(400, USER_ID))
        }
        else {
            await axios.post(microservicesurl.configurationpath + 'deleteOrgCustLocation', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send(new Response(400, nodataMsg))
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHINGMSG))
            });
        }

    } catch (error) {
        res.send(new APIError(205, SOMETHINGMSG));
    }

});
router.post('/getOrganizationList', async (req, res) => {
    try {
        let body = req.body;
        if (!body.C_ID) {
            res.send(new APIError(400, CLIENT_ID))
        }
        else if (!body.size) {
            res.send(new APIError(400, pageSizeMsg))
        } else if (!body.pageNo) {
            res.send(new APIError(400, pageNoErrMsg))
        } else if (!body.userId) {
            res.send(new APIError(400, USER_ID))
        }

        else {
            await axios.post(microservicesurl.configurationpath + 'getOrganizationList', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send(new Response(400, nodataMsg))
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHINGMSG))
            });
        }

    } catch (error) {
        res.send(new APIError(205, SOMETHINGMSG));
    }

});
router.post('/getOrgCustList', async (req, res) => {
    try {
        let body = req.body;
        if (!body.C_ID) {
            res.send(new APIError(400, CLIENT_ID))
        } else if (!body.ORG_ID) {
            res.send(new APIError(400, orgIdErrMsg))
        } else if (!body.size) {
            res.send(new APIError(400, pageSizeMsg))
        } else if (!body.pageNo) {
            res.send(new APIError(400, pageNoErrMsg))
        } else if (!body.userId) {
            res.send(new APIError(400, USER_ID))
        }

        else {
            await axios.post(microservicesurl.configurationpath + 'getOrgCustList', body).then(result => {
                if (result) {
                    res.send(result.data);
                }
                else {
                    res.send(new Response(400, nodataMsg))
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHINGMSG))
            });
        }

    } catch (error) {
        res.send(new APIError(205, SOMETHINGMSG));
    }

});
// Customer Related API's <==== END =========>


//create location 4.2 Changes
router.post('/create-location', async (req, res) => {
    try {
        let body = req.body;
        const latRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
        const lngRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
        var reg = new RegExp('^[0-9]+$');
        let validName = new RegExp('^[a-zA-Z0-9/ _-]+$');
        let emailrex = new RegExp("^[\\w!#$%&'*+/=?`{|}~^-]+(?:\\.[\\w!#$%&'*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}$");

        // let splitName = body.name.split("")[0];
        let validateRequest: any = await validateJsonData(body);
        if (validateRequest.status == 200) {
            if (!body.name) {
                res.send(new APIResponse(400, LOCATION_NAME_));
            }
            if (body.isDetention == true && body.isUnauthorized == true) {
                res.send(new APIError(400, "Detention and Unauthorized both are not allowed to Enabled"))
            }
            else if (body.name.match(reg) !== null) {
                res.send(new APIError(400, Valid_LOCATION_NAME_))
            }
            else if (!body.name.match(validName)) {
                res.send(new APIError(400, Valid_LOCATION_NAME_))
            }
            else if (!body.lng) {
                res.send(new APIResponse(400, STOP_LONGITUDE_MSG));
            }
            else if (!body.lat) {
                res.send(new APIResponse(400, STOP_LATITUDE_MSG));
            }
            else if (!body.userid) {
                res.send(new APIResponse(400, USER_ID));
            }
            else if (!body.clientid) {
                res.send(new APIResponse(400, CLIENT_ID));
            }
            else if (!body.stoptype) {
                res.send(new APIResponse(400, LOCATION_TYPE_MSG));
            }
            else if (!latRegex.exec(body.lat)) {
                res.send(new ResponseLocation(400, LOCATION_LATITUDE_MSG));
            }
            else if (!lngRegex.exec(body.lng)) {
                res.send(new ResponseLocation(400, LOCATION_LONGIITUDE_MSG));
            }
            // else if (!body.erpcode) {
            //     res.send(new APIResponse(400, erpcodeMsg));
            // }
            else if (body.erpcode && body.erpcode.length > 20) {
                res.send(new APIResponse(400, erpLengthMsg));
            }

            else {
                if (body.hasOwnProperty('email')) {
                    if (body.email.length > 0 && !body.email.match(emailrex)) {
                        res.send(new APIResponse(400, MAILID_VALIDATE_MSG));
                        return;
                    }
                }
                if (body.hasOwnProperty('phoneNo')) {
                    if (body.phoneNo && body.phoneNo.length != 10) {
                        res.send(new APIResponse(400, mobLengthMsg));
                        return;
                    }
                }
                if (body.hasOwnProperty('area')) {
                    if (body.area && body.area < 500) {
                        res.send(new APIResponse(400, geoRadiusMsg));
                        return;
                    }
                }
                body.clientID = body.clientid
                await axios.post(microservicesurl.configurationpath + 'v1/get-stop-category-dropdown', body).then(result => {
                    if (result.data) {
                        var findstoptype = [];
                        if (body.stoptype) {
                            findstoptype= result.data.StoptypeDetails.filter(i => i.ST_Name == body.stoptype)
                           //body.stoptype = findstoptype[0].ST_ID
                        }
                        if (!findstoptype.length) {
                            res.send(new Response(204, "Invalid stop Type"))
                            return false;
                        }
                    }
                    else {
                        res.send(new Response(204, NO_DATA_AVL_MSG))
                        return false;
                    }
                })
                await axios.post(microservicesurl.configurationpath + 'create-location', body, { headers: jsonheader }).then(async result => {
                    res.send(result.data)
                }).catch(error => {
                    res.send(new APIResponse(500, SOMETHING_WENT_MSG))
                })
            }
        }
        else {
            res.send(validateRequest);
            return
        }
    } catch (error) {
        res.send(new APIResponse(500, SOMETHING_WENT_MSG));
    }
});

//update location 4.2 Changes
router.post('/update-location', async (req, res) => {
    try {
        let body = req.body;
        const latRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
        const lngRegex = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/g;
        var reg = new RegExp('^[0-9]+$');
        let validName = new RegExp('^[a-zA-Z0-9/ _-]+$');
        let emailrex = new RegExp("^[\\w!#$%&'*+/=?`{|}~^-]+(?:\\.[\\w!#$%&'*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}$");

        let splitName = body.name.split("")[0];
        let validateRequest: any = await validateJsonData(body);
        if (validateRequest.status == 200) {
            if (!body.name) {
                res.send(new APIResponse(400, LOCATION_NAME_));
            }
            if (body.isDetention == true && body.isUnauthorized == true) {
                res.send(new APIError(400, "Detention and Unauthorized both are not allowed to Enabled"))
            }
            else if (splitName.match(reg) !== null) {
                res.send(new APIError(400, Valid_LOCATION_NAME_))
            }
            else if (!body.name.match(validName)) {
                res.send(new APIError(400, Valid_LOCATION_NAME_))
            }
            else if (!body.lng) {
                res.send(new APIResponse(400, STOP_LONGITUDE_MSG));
            }
            else if (!body.lat) {
                res.send(new APIResponse(400, STOP_LATITUDE_MSG));
            }
            else if (!body.userid) {
                res.send(new APIResponse(400, USER_ID));
            }
            else if (!body.clientid) {
                res.send(new APIResponse(400, CLIENT_ID));
            }
            else if (!body.stoptype) {
                res.send(new APIResponse(400, LOCATION_TYPE_MSG));
            }
            else if (!latRegex.exec(body.lat)) {
                res.send(new ResponseLocation(400, LOCATION_LATITUDE_MSG));
            }
            else if (!lngRegex.exec(body.lng)) {
                res.send(new ResponseLocation(400, LOCATION_LONGIITUDE_MSG));
            }
            // else if (!body.erpcode) {
            //     res.send(new APIResponse(400, "ERPCode is required"));
            // }
            else if (body.erpcode && body.erpcode.length > 20) {
                res.send(new APIResponse(400, erpLengthMsg));
            }

            else {
                if (body.hasOwnProperty('email')) {
                    if (body.email.length > 0 && !body.email.match(emailrex)) {
                        res.send(new APIResponse(400, MAILID_VALIDATE_MSG));
                        return;
                    }
                }
                if (body.hasOwnProperty('phoneNo')) {
                    if (body.phoneNo && body.phoneNo.length != 10) {
                        res.send(new APIResponse(400, mobLengthMsg));
                        return;
                    }
                }
                if (body.hasOwnProperty('area')) {
                    if (body.area && body.area < 500) {
                        res.send(new APIResponse(400, geoRadiusMsg));
                        return;
                    }
                }
                body.clientID = body.clientid
                await axios.post(microservicesurl.configurationpath + 'v1/get-stop-category-dropdown', body).then(result => {
                    if (result.data) {
                        var findstoptype = [];
                        if (body.stoptype) {
                            findstoptype= result.data.StoptypeDetails.filter(i => i.ST_Name == body.stoptype)
                           //body.stoptype = findstoptype[0].ST_ID
                        }
                        if (!findstoptype.length) {
                            res.send(new Response(204, "Invalid stop Type"))
                            return false;
                        }
                    }
                    else {
                        res.send(new Response(204, NO_DATA_AVL_MSG))
                        return false;
                    }
                })
                await axios.post(microservicesurl.configurationpath + 'update-location', body, { headers: jsonheader }).then(async result => {
                    res.send(result.data)
                }).catch(error => {
                    res.send(new APIResponse(500, SOMETHING_WENT_MSG))
                })
            }
        }
        else {
            res.send(validateRequest);
            return
        }
    } catch (error) {
        res.send(new APIResponse(500, SOMETHING_WENT_MSG));
    }
});

//getting Location Details

router.post('/get-location-details', async (req, res) => {
    try {
        let body = req.body;
        //if (body.userid == req.headers.tokenuserid) {

            if (!body.userid) {
                res.send(new Response(400, USER_ID));
            }
            else if (!body.clientid) {
                res.send(new Response(400, CLIENT_ID));
            }
            else {
                await axios.post(microservicesurl.configurationpath + 'get-location-details', body, { headers: jsonheader }).then(async result => {
                    res.send(result.data)
                }).catch(error => {
                    res.send(new Response(500, SOMETHING_WENT_MSG))
                })
            }
        //}
         if (!body.size) {
            res.send(new Response(400, pageSizeMsg));
        } else if (!body.pageNo) {
            res.send(new Response(400, pageNoErrMsg));
        }
        // else {
        //     res.send(new Response(201, "User not exist"))

        // }

    } catch (error) {
        res.send(new Response(500, SOMETHING_WENT_MSG));
    }
})



//delete location
router.post('/delete-location', async (req, res) => {
    try {
        let body = req.body;
        if (!body.userid) {
            res.send(new ResponseLocation(400, USER_ID));
        }
        if (body.userid == req.headers.tokenuserid) {
            if (!body.id) {
                res.send(new ResponseLocation(400, idErrMsg));
            }
            else {
                await axios.post(microservicesurl.configurationpath + 'delete-location', body, { headers: jsonheader }).then(async result => {
                    res.send(result.data)
                }).catch(error => {
                    res.send(new ResponseLocation(500, SOMETHING_WENT_MSG))
                })
            }

        } else {
            res.send(new ResponseLocation(201, "Please enter valid Userid"))

        }

    } catch (error) {
        res.send(new ResponseLocation(500, SOMETHING_WENT_MSG));
    }
});


router.post("/v1/GetContractor", async (req, res) => {
    try {
        let body = req.body;
        if (!body.userId) {
            res.send(new CONFIG_APIResponse(400, UID_ERR_MSG));
        }
        else if (!body.clientID) {
            res.send(new CONFIG_APIResponse(400, CID_ERR_MSG));
        }
        else if (body.pageNo && body.isExcel == 1) {
            res.send(new CONFIG_APIResponse(400, IndexNotMsg));
        }
        else if (body.pageSize && body.isExcel == 1) {
            res.send(new CONFIG_APIResponse(400, PageNotMsg));
        }
        else if (!body.pageNo && body.isExcel == 0) {
            res.send(new CONFIG_APIResponse(400, indexMsg));
        }
        else if (!body.pageSize && body.isExcel == 0) {
            res.send(new CONFIG_APIResponse(400, pageSizeMsg));
        }
        else if (!body.isExcel.toString()) {
            res.send(new CONFIG_APIResponse(400, isExcelMsg));
        }
        else {

            await axios.post(microservicesurl.configurationpath + 'v1/getContractorData', body).then(result => {
                if (result.data) {
                    res.send(result.data);
                }
                else {
                    res.send(new CONFIG_APIResponse(204, NO_DATA_AVL_MSG))
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_ERR_MSG))
            });


        }

    } catch (error) {
        let response: any = new ResponseWithOnlyPage(205, SOMETHING_WENT_ERR_MSG, new Page());
        response['ContractorDetails'] = [];
        res.send(response);
    }
});

router.post("/DeleteContractor", async (req, res) => {
    let body = req.body;
    try {
        if (!body.contractorID) {
            res.send(new CONFIG_APIResponse(400, conidMsg));
        } else if (!body.userId) {
            res.send(new CONFIG_APIResponse(400, UID_ERR_MSG));
        } else {

            await axios.post(microservicesurl.configurationpath + 'deleteContractors', body).then(result => {
                if (result.data) {
                    res.send(result.data);
                }
                else {
                    res.send(new CONFIG_APIResponse(204, NO_DATA_AVL_MSG))
                }
            }).catch(error => {
                res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_ERR_MSG))
            });
        }
    }
    catch (err) {
        loggerDetails.logger.error(" sourceIP : " + ip + "," + " ContractorID : " + body.contractorID + "," + " time : " + dateFormat(new Date(), "yyyy-mm-dd h:MM:ss") + "," + " status :" + EXCEPTION_MSG + "," + " Exception Message : " + err.message);
        res.send(new CONFIG_APIResponse(205, SOMETHING_WENT_ERR_MSG));
    }
});

router.post('/v1/addMaterial', async (req, res) => {
    try {
        let body = req.body;
        let mno = new RegExp('^[A-z]{1}');
        let mtnum = new RegExp(/^[a-zA-Z0-9.\-]+$/);
        let alphanumeric=new RegExp(/^[a-zA-Z][a-zA-Z0-9. /_ ]+$/);
        let mtyp =new RegExp( /^[a-zA-Z][a-zA-Z0-9]+$/);
        let mtcode: any
        let mname: any

        if (body.mtcode) {
            mtcode = body.mtcode.toString();
        }
        if (body.mname) {
            mname = body.mname.toString();
        }
        let mtype: String = body.mtype.toString();
        let skucode: String = body.skucode.toString();
        let hsncode: String = body.hsncode.toString();
        let desc: String = body.desc.toString();

        
        if ( mtcode && !mtcode.match(mno)) {
            res.send(new APIError(400,  MCODE_VALIDATE_MSG));
            return false;
        }
        if ( mname && !mname.match(mno)) {
            res.send(new APIError(400,  MNAME_VALIDATE_MSG));
            return false;
        }
        if (mtype && !mtype.match(mno)) {
            res.send(new APIError(400,  MTYPE_VALIDATE_MSG));
            return false;
        }
        if ( skucode &&!skucode.match(mno)) {
            res.send(new APIError(400,  SCODE_VALIDATE_MSG));
            return false;
        }
        if ( hsncode &&!hsncode.match(mno)) {
            res.send(new APIError(400,  HCODE_VALIDATE_MSG));
            return false;
        }
        if ( desc &&!desc.match(mno)) {
            res.send(new APIError(400,  DESC_VALIDATE_MSG));
            return false;
        }
        if (!body.adminid) {
            res.send(new APIError(400, adminIdErrMsg))
        }
        if (!body.mname) {
            res.send(new APIError(400, materialErrMsg))
        }
        else if (body.mname && !body.mname.match(alphanumeric)) {
            res.send(new APIError(400, NameValidMsg))
            return false;
        }
        else if (body.mname && ! validateValue(body.mname)) {
            res.send(new APIError(202, Mname_minmax))
            return false;
        }
        if (!body.loginmailid) {
            res.send(new APIError(400, loginIdErrMsg))
        }
        if (!body.mtcode) {
            res.send(new APIError(400,  material_code_Msg ))
            return false;
        }
        else if (body.mtcode && !body.mtcode.match(mtnum)) {
            res.send(new APIError(400, material_val));
            return false;
        }
        else if (body.mtcode && !validateCode(body.mtcode)) {
            res.send(new APIError(202, Mcode_minmax))
            return false;
        }
        else if (body.mtype && !body.mtype.match(mtyp)) {
            res.send(new APIError(400, MTY_VAL));
            return false;
        }
        else if (body.mtype &&!validatemtype(body.mtype)) {
            res.send(new APIError(202,Mtype_minmax))
            return false;
        }
        if (body.skucode && !body.skucode.match(mtnum)) {
            res.send(new APIError(400, SKU_VAL));
            return false;
        }
        else if (body.skucode &&!validateCode(body.skucode)) {
            res.send(new APIError(202, SKUCode_minmax ))
            return false;
        }
        else if (body.hsncode && !body.hsncode.match(mtnum)) {
            res.send(new APIError(400, HSN_VAL));
            return false;
        }
        else if (body.hsncode &&!validateCode(body.hsncode)) {
            res.send(new APIError(202, HSNCode_minmax))
            return false;
        }
        // else if (body.desc &&!body.desc.match(alphanumeric)) {
        //     res.send(new APIError(400,"invalid description"))
        // }
        else if ( body.desc &&!validateDesc(body.desc)) {
            res.send(new APIError(202, desc_minmax))
            return false;
        }
        else {
            await axios.post(microservicesurl.configurationpath  + 'v1/addMaterial', body).then(result => {
                res.send(result.data);
            }).catch(error => {
                res.send(new APIError(205, SOMETHINGMSG))
            });
        }
    }
    catch (error) {
        res.send(new APIError(205, SOMETHINGMSG))
    }

});
export = router

function validateValue(value) {
    var reg = (/^[a-zA-Z][a-zA-Z0-9. /_ ]+$/); 
    var len = {min:4,max:30};
  
    if (!reg.test(value)) {
      console.log('didn\'t match regex');
      return false;
    }
  
    if (value.length < len.min || value.length > len.max) {
      console.log('incorrect length: ' + value);
      return false;
    }
  
    console.log('correct length: ' + value);
    return true;
  }
  function validateCode(value) {
    var reg = /^[a-zA-Z0-9.\-_]+$/g; 
    var len = {min:4,max:30};
  
    if (!reg.test(value)) {
      console.log('didn\'t match regex');
      return false;
    }
  
    if (value.length < len.min || value.length > len.max) {
      console.log('incorrect length: ' + value);
      return false;
    }
  
    console.log('correct length: ' + value);
    return true;
  }
  function validateDesc(value) {
    //var reg = (/^[a-zA-Z][a-zA-Z0-9 ]+$/);
    var len = {min:0,max:250};
    // if (!reg.test(value)) {
    //     console.log('didn\'t match regex');
    //     return false;
    //   }
    
      if (value.length < len.min || value.length > len.max) {
        console.log('incorrect length: ' + value);
        return false;
      }
    
      console.log('correct length: ' + value);
      return true;
  }
  function validatemtype(value) {
    var reg = ( /^[a-zA-Z][a-zA-Z0-9]+$/);
    var len = {min:4,max:20};
    if (!reg.test(value)) {
        console.log('didn\'t match regex');
        return false;
      }
    
      if (value.length < len.min || value.length > len.max) {
        console.log('incorrect length: ' + value);
        return false;
      }
    
      console.log('correct length: ' + value);
      return true;
  }
