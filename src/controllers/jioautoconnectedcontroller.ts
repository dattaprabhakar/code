
import Router from 'express';
import { SOMETHING_WENT_MSG, USER_ID, TOKEN_ID, MANDATORY_ERROR_MSG, USER_NAME, PASSWORD_VAILD_MSG, SUCCESS_MSG, NO_DATA_AVL_MSG, PASSCODEMESSAGE, userIdMsg, FROM_DATE_MSG, TO_DATE_MSG, registrationMsg, tripIdMsg, ENTERPRISE, INVALID_DRIVER_NAME, INVALID_DRIVER_MNO, mobileMsg, tripId, nodataMsg, SOMETHINGMSG } from './../utils/errormsg';
import { APIResponse, LoginResponse, tokenResponse, tokenResponseAutoMarket, Response, ResponseLocation, APIResponseForConsent } from './../utils/status';
import { microservicesurl, Token } from './../utils/config';
import axios from 'axios';
import { generateToken } from './../utils/JWTToken';
import { getEncryptPassword } from './../utils/common';
import { isExitUserLoginForJHS, isExitUserLoginForJMTI, isExitUserLoginForJMTINew, removeToken, removeTokenForJHS, removeTokenForJMTI, removeTokenForJMTINew, tokenPushToArray, tokenPushToArrayForJHS, tokenPushToArrayForJMTI, tokenPushToArrayForJMTINew, isExitUserLoginForJMToken, removeTokenForJM, tokenPushToArrayForJMToken, isExitUserLoginForJMTIRedis, tokenPushToArrayForJMTIRedis, isExitUserLoginForJHS_JMTI, tokenPushToArrayForJHS_JMTI, removeJMTITokenRedis, SIMRegistration_V2, getConsentSIM } from './common';
import moment from 'moment';
var fs = require("fs");
var config = fs.readFileSync("./thirdpartyconfig.json");
let config_details = JSON.parse(config);
const router = Router();
const jsonheader = {
    'Content-Type': 'application/json'
}
const request = require('request');
router.post("/v1/gettoken", async (req, res) => {
    let resultData: any = {};
    try {
        let body = req.body;
        //body.otp = "123456";
        let token;
        let expires_in;
        if (!body.username) {
            res.send(new tokenResponseAutoMarket(201, USER_NAME))
            return
        }
        else if (!body.password) {
            res.send(new tokenResponseAutoMarket(201, PASSCODEMESSAGE))
            return
        }
        else {
            let result: any = {} 
            let atoken: any = {};
            let encryptedpwd = await getEncryptPassword(body.password)
            let jsonbody = { username: body.username, password: encryptedpwd }

            await axios.post(microservicesurl.jca_url + 'v1/user-validate', jsonbody).then(async result => {
                if (result.data) {
                    let loginResonse: any = result.data;
                    if (loginResonse.status == 201) {
                        let isExitUserToken: any = await isExitUserLoginForJHS(loginResonse.userid);
                        if (isExitUserToken.status == 200) {
                            let expiresEpoch = Number(isExitUserToken.data.tokens[0].expiresin);
                            let currentEpoch = Date.now();

                            if ((expiresEpoch > currentEpoch) && isExitUserToken.data.tokens[0].tokenkey != "") {
                                token = isExitUserToken.data.tokens[0].tokenkey;
                                expires_in = Number(isExitUserToken.data.tokens[0].expiresin)
                            } else {
                                await removeTokenForJHS(loginResonse.userid, isExitUserToken.data.tokens[0].token);
                                let genTokenResp = await generateToken(loginResonse.userid);
                                await tokenPushToArrayForJHS(loginResonse.userid, genTokenResp, body.username);
                                token = genTokenResp.tokenkey;
                                expires_in = Number(genTokenResp.expires_in)
                            }

                        } else {
                            let genTokenResp = await generateToken(loginResonse.userid);
                            await tokenPushToArrayForJHS(loginResonse.userid, genTokenResp, body.username);
                            token = genTokenResp.tokenkey;
                            expires_in = Number(genTokenResp.expires_in)
                        }
                        resultData.token = token;
                        resultData.expiryIn = expires_in;
                        resultData.tokenuserid = loginResonse.userid;

                        res.send(new LoginResponse(200, SUCCESS_MSG, resultData))
                        return
                    }
                    res.send(new LoginResponse(loginResonse.status, loginResonse.message, resultData));

                }
            }).catch(error => {
                res.send(new LoginResponse(205, SOMETHING_WENT_MSG, ''));
            });

        }

    } catch (error) {
        res.send(new tokenResponseAutoMarket(205, SOMETHING_WENT_MSG, '', ''));
    }
});
//New endpoint to validate and generate JHS, JMTI and JM tokens
router.post("/v2/gettoken", async (req, res) => {
    let resultData: any = {};
    try {
        let body = req.body
        let token;
        let expires_in;
        if (!body.username) {
            res.send(new tokenResponseAutoMarket(201, USER_NAME))
            return
        }
        else if (!body.password) {
            res.send(new tokenResponseAutoMarket(201, PASSCODEMESSAGE))
            return
        }
        else if (!body.enterpriseid) {
            res.send(new tokenResponseAutoMarket(201, ENTERPRISE))
            return
        }
        else {
            let user_exist_in_jmti = true
            let encryptedpwd = await getEncryptPassword(body.password)
            let jsonbody = { username: body.username, password: encryptedpwd }
            let enterpriseid = body.enterpriseid
            //Check user exist in JHS db and added in JMTI
            await axios.post(microservicesurl.jca_url + 'v2/user-validate', jsonbody).then(async result => {
                console.log("JHS db response", result.data);
                if (result.data.status == 201 && (result.data.jmtiStatus == 1 || result.data.jmtiStatus == 2 || result.data.jmtiStatus == 3)) {
                    //&& (result.data.jmtiStatus == 1 || result.data.jmtiStatus == 2 || result.data.jmtiStatus == 3)) {
                    //&& (result.data.jmtiStatus == 1 || result.data.jmtiStatus == 2 || result.data.jmtiStatus == 3)) {
                    //Validate and generate JM token
                    await GetToken(body.username, result.data.apiPassword).then(async (jm_token_respone: any) => {
                        //let jm_token_respone: any = await tokenValidityForJMToken(body.username, body.password);  
                        console.log("jm Token response:" + JSON.stringify(jm_token_respone))

                        if (jm_token_respone.status == 200 && jm_token_respone.data.access_token != undefined) {
                            //validate and generate JMTI token
                            await tokenValidityForJMTINew(body.username, enterpriseid, result.data.userid).then(async (jmtitokenRes: any) => {
                                // let jmtitokenRes: any = microservicesurl.isRedisCache ? await isExitUserLogin_V1(_result.adata.userid) : await tokenValidityForJMTINew(body.username, enterpriseid);
                                console.log("JMTI responce is:" + JSON.stringify(jmtitokenRes))
                                if (jmtitokenRes.status == 200) {
                                    // console.log("jmti Token response", jmtitokenRes.data.token)

                                    //Check and generate JHS token and return
                                    let loginResonse: any = result.data;
                                    if (loginResonse.status == 201) {
                                        //let isExitUserToken: any = await isExitUserLoginForJHS(loginResonse.userid);
                                        let isExitUserToken: any = microservicesurl.isRedisCache ? await isExitUserLoginForJHS_JMTI(loginResonse.userid) : await isExitUserLoginForJHS(loginResonse.userid);
                                        if (isExitUserToken.status == 200) {
                                            let expiresEpoch = Number(isExitUserToken.data.tokens[0].expiresin);
                                            let currentEpoch = Date.now();

                                            if ((expiresEpoch > currentEpoch) && isExitUserToken.data.tokens[0].tokenkey != "") {
                                                token = isExitUserToken.data.tokens[0].tokenkey;
                                                expires_in = Number(isExitUserToken.data.tokens[0].expiresin)
                                            } else {
                                                await removeTokenForJHS(loginResonse.userid, isExitUserToken.data.tokens[0].token);
                                                let genTokenResp = await generateToken(loginResonse.userid);
                                                microservicesurl.isRedisCache ? await tokenPushToArrayForJHS_JMTI(loginResonse.userid, genTokenResp, body.username) : await tokenPushToArrayForJHS(loginResonse.userid, genTokenResp, body.username);
                                                token = genTokenResp.tokenkey;
                                                expires_in = Number(genTokenResp.expires_in)
                                            }

                                        } else {
                                            let genTokenResp = await generateToken(loginResonse.userid);
                                            microservicesurl.isRedisCache ? await tokenPushToArrayForJHS_JMTI(loginResonse.userid, genTokenResp, body.username) : await tokenPushToArrayForJHS(loginResonse.userid, genTokenResp, body.username);
                                            token = genTokenResp.tokenkey;
                                            expires_in = Number(genTokenResp.expires_in)
                                        }
                                        resultData.token = token;
                                        resultData.expiryIn = expires_in;
                                        resultData.tokenuserid = loginResonse.userid;
                                        res.send(new LoginResponse(200, SUCCESS_MSG, resultData))
                                        return
                                    }
                                    res.send(new LoginResponse(loginResonse.status, loginResonse.message, resultData));

                                }
                                else {
                                    console.log("JMTI responce isin else:" + JSON.stringify(jmtitokenRes))
                                    res.send(new LoginResponse(205, SOMETHING_WENT_MSG, ''));
                                }
                            })
                        }
                        else {
                            console.log("JM responce is in else:" + JSON.stringify(jm_token_respone))
                            res.send(new LoginResponse(205, SOMETHING_WENT_MSG, ''));
                        }
                    }).catch(err => {
                        res.send(new LoginResponse(205, "JM API issue", ''));
                    })
                }
                else {
                    res.send(new LoginResponse(205, "Unauthorized", ''));
                }
            }).catch(err => {
                res.send(new LoginResponse(205, SOMETHING_WENT_MSG, ''));
            })

        }

    }
    catch (err) {

    }

})
async function checkUserExistInJHSDB(jsonbody) {
    try {
        return new Promise(async (resolve, reject) => {
            await axios.post(microservicesurl.jca_url + 'v1/user-validate', jsonbody).then(async result => {
                if (result.data) {
                    resolve({ data: result.data })
                }
                else {
                    resolve({ data: "" })
                }
            })
        })
    }
    catch (err) {
        console.log("Error occured" + err)
    }
}
router.post('/vehicle/v1/attributes', async (req, res) => {
    try {
        console.log("Entered /vehicle/v1/attributes API");
        let body = req.body;
        let apiKey;
        const userid = req.headers.tokenuserid;
        let userName = Token.userName;
        let password = Token.password;
        let enterpriseid = Token.enterpriseid;
        let enterpriseName, secretKey, newApikey;
        // Need to write logic for check token validity

        if (!body.rto_number) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (body.attributes.length <= 0) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.endtime) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else {
            await tokenValidityForJMTINew(userName, enterpriseid, userid ).then(async (tokenRes:any) => {
                console.log("Token response from tokenValidityForJMTINew : " + JSON.stringify(tokenRes));
                if (tokenRes.status == 200) {
                    apiKey = tokenRes.data.token;
                    console.log("Token is: " + apiKey);
                    let url = Token.jmtiurl;
    
                    apiKey = tokenRes.data.token;
                    console.log("Token is: " + apiKey);
                    enterpriseName = tokenRes.data.enterpriseName;
                    secretKey = tokenRes.data.account_Secret;
    
                    await getattributes(body, apiKey, url).then(async (genAttributeResp: any) => {
                        //// Need to call JIO API
                        if (genAttributeResp.status == 200) {
                            console.log("V1/Attribute data is: " + JSON.stringify(genAttributeResp));
                            
                            res.send(genAttributeResp.data)
                        }  else if (genAttributeResp.status == 401) {
                            console.log('Entered into Refresh JMTI Token End Point Is V1/Attribute');
                            console.log('Refresh JMTI Token Parameters..'+"EnterPrise_ID.."+ enterpriseid +", secretKey.." + secretKey + "EnterPrise_Name.." + enterpriseName+ ", UserName.." + userName+ "User ID..." + userid);
                            // tokenValidityRetryForJMTI(username, body.enterpriseid, userid).then(async (tokenData: any) => {
                             await refreshTokenForJMTI(enterpriseid,enterpriseName, apiKey, secretKey, userName, userid).then(async (tokenData: any) => {
                                 if (tokenData.status == 200) {
                                     newApikey = tokenData.data.token;
    
                                     await getattributes(body, newApikey, url).then(async (genResp: any) => {
                                         if (genResp.status == 200) {
                                             console.log("Attribute data is: " + JSON.stringify(genResp));
                                             res.send(genResp.data)
                                         }
                                         else {
                                             res.send(new Response(202, "No Data Available", genResp.data))
                                         }
                                     }).catch(error => {
                                         console.log("Error in getattributes():" + error.message);
                                         res.send(new Response(205, SOMETHING_WENT_MSG))
                                     });
                                 }
                                 else {
                                     res.send(new Response(202, "JMTI token regeneration failed", tokenData.data))
                                 }
                             }).catch(error => {
                                 console.log("Error in tokenValidityRetryForJMTI():" + error.message);
                                 res.send(new Response(205, SOMETHING_WENT_MSG))
                             });
                         }
                        else {
                            res.send(new Response(202, "No Data Available"))
                        }
                    }).catch(error => {
                        console.log("Error in vehicle/v1/attributes (getattributes): " + error.message)
                        res.send(new Response(205, SOMETHING_WENT_MSG))
                    });
                }
                else {
                    console.log("Error in token result status is not equal to 200");
                    res.send(new Response(400, NO_DATA_AVL_MSG));
                }
            }).catch(err => {
                console.log("Token generation failed...",err.message);
                res.send(new Response(205, "JMTI API issue", ''));
            })  
        }
    } catch (error) {
        console.log("Error in vehicle/v1/attributes: " + error.message);
        let _response: any = new Response(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})
router.post('/vehicle/v2/attributes', async (req, res) => {
    try {
        console.log("Entered /vehicle/v2/attributes API");
        let body = req.body;
        let apiKey, newApikey, enterpriseName, secretKey;
        const userid = req.headers.tokenuserid;

        if (!body.rto_number) {
            res.send(new APIResponse(202, "RTO Number is required"))
        }
        else if (body.attributes.length <= 0) {
            res.send(new APIResponse(202, "Attribute is required"))
        }
        else if (!body.endtime) {
            res.send(new APIResponse(202, "EndTime is required"))
        }
        else if (!body.enterpriseid) {
            res.send(new APIResponse(202, ENTERPRISE))
        }
        else {
            let responce: any;
            await axios.post(microservicesurl.jca_url + 'JMTI_userDetails', body).then(async result => {
                responce = result.data;
                if (responce.status == 201) {
                    console.log("JHS responce is:" + JSON.stringify(responce));
                    let username = responce.username;
                    let password = responce.password;
                    await tokenValidityForJMTINew(username, body.enterpriseid, userid).then(async (tokenRes: any) => {
                        await GetToken(username, password).then(async (jm_token_respone: any) => {
                            // let jm_token_respone: any = await tokenValidityForJMToken(body.userName, body.enterpriseid);
                            console.log("Token responce from tokenValidityForJMTI: " + JSON.stringify(tokenRes));
                            console.log("Token responce from GetToken: " + JSON.stringify(jm_token_respone));

                            if (tokenRes.status == 200 && jm_token_respone.status == 200) {
                                apiKey = tokenRes.data.token;
                                let JMToken = jm_token_respone.data.access_token;
                                console.log("Token is: " + apiKey);
                                let url = Token.jmtiurl;
                                enterpriseName = tokenRes.data.enterpriseName;
                                secretKey = tokenRes.data.account_Secret;

                                await getattributesJCA(body, apiKey, url, JMToken).then(async (genAttributeResp: any) => {
                                    //// Need to call JIO API
                                    if (genAttributeResp.status == 200) {
                                        console.log("Attribute data is: " + JSON.stringify(genAttributeResp));
                                        res.send(genAttributeResp.data)
                                    }
                                    else if (genAttributeResp.status == 401) {
                                       // tokenValidityRetryForJMTI(username, body.enterpriseid, userid).then(async (tokenData: any) => {
                                        console.log('Entered into Refresh JMTI Token End Point Is v2/attributes');           
                                        console.log('Refresh JMTI Token Parameters..'+"EnterPrise_ID.."+ body.enterpriseid +", secretKey.." + secretKey + "EnterPrise_Name.." + enterpriseName);
                                        refreshTokenForJMTI(body.enterpriseid,enterpriseName, apiKey, secretKey, username, userid).then(async (tokenData: any) => {
                                            if (tokenData.status == 200) {
                                                newApikey = tokenData.data.token;

                                                await getattributesJCA(body, newApikey, url, JMToken).then(async (genResp: any) => {
                                                    if (genResp.status == 200) {
                                                        console.log("Attribute data is: " + JSON.stringify(genResp));
                                                        res.send(genResp.data)
                                                    }
                                                    else {
                                                        res.send(new Response(202, "No Data Available", genResp.data))
                                                    }
                                                }).catch(error => {
                                                    console.log("Error in getattributesJCA():" + error.message);
                                                    res.send(new Response(205, SOMETHING_WENT_MSG))
                                                });
                                            }
                                            else {
                                                res.send(new Response(202, "JMTI token regeneration failed", tokenData.data))
                                            }
                                        }).catch(error => {
                                            console.log("Error in tokenValidityRetryForJMTI():" + error.message);
                                            res.send(new Response(205, SOMETHING_WENT_MSG))
                                        });
                                    }
                                    else {
                                        res.send(new Response(202, "No Data Available", genAttributeResp.data))
                                    }
                                }).catch(error => {
                                    console.log("Error in getattributesJCA():" + error.message);
                                    res.send(new Response(205, SOMETHING_WENT_MSG))
                                });
                            }
                            else {
                                res.send(new Response(400, NO_DATA_AVL_MSG, tokenRes));
                            }
                        }).catch(err => {
                            console.log("Error in tokenValidityForJMTINew():" + err.message);
                            res.send(new Response(205, "JM API issue"));
                        })
                    }).catch(err => {
                        console.log("Token generation failed");
                        res.send(new Response(205, "JMTI API issue", ''));
                    })
                }
                else {
                    res.send(new Response(205, "EnterpriseId not available in JHS", ''));
                }
            }).catch(err => {
                res.send(new Response(205, err.message, ''));
            })

        }
    } catch (error) {
        let _response: any = new Response(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})
router.post('/vehicle/v1/motionstatus', async (req, res) => {
    try {
        let body = req.body;
        let apiKey;
        const userid = req.headers.tokenuserid;
        let userName = Token.userName;
        let password = Token.password;
        let enterpriseid = Token.enterpriseid;
        let enterpriseName, secretKey, newApikey;

        if (!body.rto_number) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else {
            await tokenValidityForJMTINew(userName, enterpriseid, userid ).then(async (tokenRes:any) => {
                console.log("Token responce from tokenValidityForJMTI: " + JSON.stringify(tokenRes));
                if (tokenRes.status == 200) {
                    apiKey = tokenRes.data.token;
                    let url = Token.jmtiurl;
                    console.log("Token is: " + apiKey);
                    enterpriseName = tokenRes.data.enterpriseName;
                    secretKey = tokenRes.data.account_Secret;
                    await getMotionStatus(body, apiKey, url).then(async (genMotionResp: any) => {
                        //// Need to call JIO API
                        if (genMotionResp.status == 200) {
                            console.log("MotionStatus data is: " + JSON.stringify(genMotionResp));
                            let vssdata:any =  await canData(body.rto_number)
                            genMotionResp.data.data.OdoMeterValue =vssdata?.OdoValue ? vssdata.OdoValue : ""
                            genMotionResp.data.data.BatteryVoltage =vssdata?.BatteryVoltage ? vssdata.BatteryVoltage :""
                            genMotionResp.data.data.FuelLevel =vssdata?.FuelLevel ? vssdata.FuelLevel :""
                            res.send(genMotionResp.data)
                        } else if (genMotionResp.status == 401) {
                            // tokenValidityRetryForJMTI(username, body.enterpriseid, userid).then(async (tokenData: any) => {
                                console.log('Entered into Refresh JMTI Token End Point Is v1/motionstatus');           
                                console.log('Refresh JMTI Token Parameters..'+"EnterPrise_ID.."+ enterpriseid +", secretKey.." + secretKey + "EnterPrise_Name.." + enterpriseName+ ", UserName.." + userName+ "User ID..." + userid);
                             await refreshTokenForJMTI(enterpriseid,enterpriseName, apiKey, secretKey, userName, userid).then(async (tokenData: any) => {
                                if ( tokenData?.status && tokenData?.status == 200) {                                    
                                     newApikey = tokenData.data.token;    
                                     await getMotionStatus(body, newApikey, url).then(async (genResp: any) => {
                                        // resolve({ status: 200, message: "Success", data: result.data })
                
                                         if (genResp.status == 200) {
                                             console.log("Attribute data is: " + JSON.stringify(genResp));
                                             let vssdatares:any =  await canData(body.rto_number)
                                             genResp.data.data.OdoMeterValue =vssdatares?.OdoValue ? vssdatares?.OdoValue :""
                                             genResp.data.data.BatteryVoltage =vssdatares?.BatteryVoltage ? vssdatares.BatteryVoltage :""
                                             genResp.data.data.FuelLevel =vssdatares?.FuelLevel ? vssdatares.FuelLevel :""
                                             res.send(genResp.data)
                                         }
                                         else {
                                             res.send(new Response(202, "No Data Available", genResp.data))
                                         }
                                     }).catch(error => {
                                         console.log("Error in getMotionStatus():" + error.message);
                                         res.send(new Response(205, SOMETHING_WENT_MSG))
                                     });
                                 }
                                 else {
                                     res.send(new Response(202, "JMTI token regeneration failed", tokenData.data))
                                 }
                             }).catch(error => {
                                 console.log("Error in tokenValidityRetryForJMTI():" + error.message);
                                 res.send(new Response(205, SOMETHING_WENT_MSG))
                             });
                         }
                        else {
                            res.send(new Response(202, "No Data Available"))
                        }
                    }).catch(error => {
                        console.log("Error in vehicle/v1/motionstatus getMotionStatus(): " + error.message);
                        res.send(new Response(205, SOMETHING_WENT_MSG))
                    });
                }
                else {
                    console.log("Error in token result status is not equal to 200");
                    res.send(new Response(400, NO_DATA_AVL_MSG));
                }
            }).catch(err => {
                console.log("Token generation failed...",err.message);
                res.send(new Response(205, "JMTI API issue", ''));
            })
        }
    } catch (error) {
        console.log("Error in vehicle/v1/motionstatus: " + error.message);
        let _response: any = new Response(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})
router.post('/vehicle/v2/motionstatus', async (req, res) => {
    try {
        let body = req.body;
        let apiKey, newApikey, enterpriseName, secretKey;
        const userid = req.headers.tokenuserid;
        if (!body.rto_number) {
            res.send(new APIResponse(202, "RTO Number is required"))
        }
        else if (!body.enterpriseid) {
            res.send(new APIResponse(202, ENTERPRISE))
        }

        else {
            // Need to write logic for check token validity
            let responce: any
            await axios.post(microservicesurl.jca_url + 'JMTI_userDetails', body).then(async result => {
                responce = result.data;
                if (responce.status == 201) {
                    console.log("JHS responce is:" + JSON.stringify(responce));
                    let username = responce.username;
                    let password = responce.password;
                    await tokenValidityForJMTINew(username, body.enterpriseid, userid).then(async (tokenRes: any) => {
                        // let jm_token_respone: any = await tokenValidityForJMToken(body.userName, body.enterpriseid);
                        await GetToken(username, password).then(async (jm_token_respone: any) => {
                            console.log("Token responce from tokenValidityForJMTI: " + JSON.stringify(tokenRes));
                            console.log("Token responce from GetToken: " + JSON.stringify(jm_token_respone));
                            if (tokenRes.status == 200 && jm_token_respone.status == 200) {
                                apiKey = tokenRes.data.token;
                                enterpriseName = tokenRes.data.enterpriseName;
                                secretKey = tokenRes.data.account_Secret;
                                let JMToken = jm_token_respone.data.access_token;
                                let url = Token.jmtiurl;
                                await getMotionStatusJCA(body, apiKey, url, JMToken).then(async (genMotionResp: any) => {
                                    //// Need to call JIO API
                                    if (genMotionResp.status == 200) {
                                        console.log("MotionStatus data is: " + JSON.stringify(genMotionResp));
                                        res.send(genMotionResp.data)
                                    }
                                    else if (genMotionResp.status == 401) {
                                        //tokenValidityRetryForJMTI(username, body.enterpriseid, userid).then(async (tokenData: any) => {
                                            console.log('Entered into Refresh JMTI Token End Point Is v2/motionstatus');           
                                            await refreshTokenForJMTI(body.enterpriseid,enterpriseName, apiKey, secretKey, username, userid).then(async (tokenData: any) => {
                                            if (tokenData.status == 200) {
                                                newApikey = tokenData.data.token;
                                                await getMotionStatusJCA(body, newApikey, url, JMToken).then(async (genResp: any) => {
                                                    if (genResp.status == 200) {
                                                        console.log("MotionStatus data is: " + JSON.stringify(genResp));
                                                        res.send(genResp.data)
                                                    }
                                                    else {
                                                        res.send(new Response(202, "No Data Available", genMotionResp.data))
                                                    }
                                                }).catch(error => {
                                                    console.log("Error in getMotionStatusJCA(): " + error.message);
                                                    res.send(new Response(205, SOMETHING_WENT_MSG))
                                                });
                                            }
                                            else {
                                                res.send(new Response(202, "JMTI token regeneration failed", tokenData.data))
                                            }
                                        }).catch(error => {
                                            console.log("Error in tokenValidityRetryForJMTI(): " + error.message);
                                            res.send(new Response(205, SOMETHING_WENT_MSG))
                                        });
                                    }
                                    else {
                                        res.send(new Response(202, "No Data Available", genMotionResp.data))
                                    }
                                }).catch(error => {
                                    console.log("Error in getMotionStatusJCA(): " + error.message);
                                    res.send(new Response(205, SOMETHING_WENT_MSG))
                                });
                            }
                            else {
                                res.send(new Response(400, NO_DATA_AVL_MSG));
                            }
                        }).catch(err => {
                            console.log("Error in GetToken(): " + err.message);
                            res.send(new Response(205, "JM API issue"));
                        })
                    }).catch(err => {
                        console.log("Token generation failed");
                        res.send(new Response(205, "JMTI API issue", ''));
                    })
                }
                else {
                    res.send(new Response(205, "EnterpriseId not available in JHS", ''));
                }
            }).catch(err => {
                res.send(new Response(205, responce.message, ''));
            })
        }
    } catch (error) {
        let _response: any = new Response(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})
router.post('/vehicle/v1/trips', async (req, res) => {
    try {
        let body = req.body;
        let apiKey;
        const userid = req.headers.tokenuserid;
        let userName = Token.userName;
        let password = Token.password;
        let enterpriseid = Token.enterpriseid;
        let enterpriseName, secretKey, newApikey;

        if (!body.rto_number) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.tripStatus) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.endtime) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!body.limit) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else {
            await tokenValidityForJMTINew(userName, enterpriseid, userid ).then(async (tokenRes:any) => {
                if (tokenRes.status == 200) {
                    console.log("Token responce from tokenValidityForJMTI: " + JSON.stringify(tokenRes));
                    apiKey = tokenRes.data.token;
                    let url = Token.jmtiurl;
                    apiKey = tokenRes.data.token;
                    enterpriseName = tokenRes.data.enterpriseName;
                    secretKey = tokenRes.data.account_Secret;
                    await getTrips(body, apiKey, url).then(async (tripsResp: any) => {
                        //// Need to call JIO API
                        if (tripsResp.status == 200) {
                            console.log("Trips data is: " + JSON.stringify(tripsResp));
                            res.send(tripsResp.data)
                        }
                        else if (tripsResp.status == 401) {
                            // tokenValidityRetryForJMTI(username, body.enterpriseid, userid).then(async (tokenData: any) => {
                                console.log('Entered into Refresh JMTI Token End Point Is v1/trips');           
                                console.log('Refresh JMTI Token Parameters..'+"EnterPrise_ID.."+ enterpriseid +", secretKey.." + secretKey + "EnterPrise_Name.." + enterpriseName+ ", UserName.." + userName+ "User ID..." + userid);
                             await refreshTokenForJMTI(enterpriseid,enterpriseName, apiKey, secretKey, userName, userid).then(async (tokenData: any) => {
                                 if (tokenData.status == 200) {
                                     newApikey = tokenData.data.token;
                                     await getTrips(body, newApikey, url).then(async (genResp: any) => {
                                         if (genResp.status == 200) {
                                             console.log("Trips Refresh Method data is: " + JSON.stringify(genResp));
                                             res.send(genResp.data)
                                         }
                                         else {
                                             res.send(new Response(202, "No Data Available", genResp.data))
                                         }
                                     }).catch(error => {
                                         console.log("Error in getTrips():" + error.message);
                                         res.send(new Response(205, SOMETHING_WENT_MSG))
                                     });
                                 }
                                 else {
                                     res.send(new Response(202, "JMTI token regeneration failed", tokenData.data))
                                 }
                             }).catch(error => {
                                 console.log("Error in refreshTokenForJMTI():" + error.message);
                                 res.send(new Response(205, SOMETHING_WENT_MSG))
                             });
                         }
    
                        else {
                            res.send(new Response(202, "No Data Available"))
                        }
                    }).catch(error => {
                        console.log("Error in vehicle/v1/trips getTrips(): " + error.message);
                        res.send(new Response(205, SOMETHING_WENT_MSG))
                    });
                }
                else {
                    console.log("Error in token result status not equal to 200");
                    res.send(new Response(400, NO_DATA_AVL_MSG));
                }
            }).catch(err => {
                console.log("Token generation failed...",err.message);
                res.send(new Response(205, "JMTI API issue", ''));
            })   
        }
    } catch (error) {
        console.log("Error in vehicle/v1/trips " + error.message);
        let _response: any = new Response(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})
router.post('/vehicle/v2/trips', async (req, res) => {
    try {
        let body = req.body;
        let apiKey, newApikey,  enterpriseName, secretKey;;
        const userid = req.headers.tokenuserid;
        if (!body.rto_number) {
            res.send(new APIResponse(202, "RTO Number is required"))
        }
        else if (!body.tripStatus) {
            res.send(new APIResponse(202, "Trip Status is required"))
        }
        else if (!body.endtime) {
            res.send(new APIResponse(202, "EndTime is required"))
        }
        else if (!body.limit) {
            res.send(new APIResponse(202, "Limit is required"))
        }
        else if (!body.enterpriseid) {
            res.send(new APIResponse(202, ENTERPRISE))
        }
        else {
            // Need to write logic for check token validity
            let responce: any;
            await axios.post(microservicesurl.jca_url + 'JMTI_userDetails', body).then(async result => {
                responce = result.data;
                if (responce.status == 201) {
                    console.log("JHS responce is:" + JSON.stringify(responce));
                    let username = responce.username;
                    let password = responce.password;
                    await tokenValidityForJMTINew(username, body.enterpriseid, userid).then(async (tokenRes: any) => {
                        // let jm_token_respone: any = await tokenValidityForJMToken(body.userName, body.enterpriseid);
                        await GetToken(username, password).then(async (jm_token_respone: any) => {
                            console.log("Token responce from tokenValidityForJMTI: " + JSON.stringify(tokenRes));
                            console.log("Token responce from GetToken: " + JSON.stringify(jm_token_respone));

                            if (tokenRes.status == 200 && jm_token_respone.status == 200) {
                                apiKey = tokenRes.data.token;
                                let JMToken = jm_token_respone.data.access_token;
                                let url = Token.jmtiurl;
                                apiKey = tokenRes.data.token;
                                enterpriseName = tokenRes.data.enterpriseName;
                                secretKey = tokenRes.data.account_Secret;
                                await getTripsJCA(body, apiKey, url, JMToken).then(async (tripsResp: any) => {
                                    //// Need to call JIO API
                                    if (tripsResp.status == 200) {
                                        console.log("Trips data is: " + JSON.stringify(tripsResp));
                                        res.send(tripsResp.data)
                                    }
                                    else if (tripsResp.status == 401) {
                                        //tokenValidityRetryForJMTI(username, body.enterpriseid, userid).then(async (tokenData: any) => {
                                            console.log('Entered into Refresh JMTI Token End Point Is v2/trips');   
                                       await refreshTokenForJMTI(body.enterpriseid,enterpriseName, apiKey, secretKey, username, userid).then(async (tokenData: any) => {
                                            if (tokenData.status == 200) {
                                                newApikey = tokenData.data.token;
                                                await getTripsJCA(body, newApikey, url, JMToken).then(async (genResp: any) => {
                                                    if (genResp.status == 200) {
                                                        console.log("Trips data is: " + JSON.stringify(genResp));
                                                        res.send(genResp.data)
                                                    }
                                                    else {
                                                        res.send(new Response(202, "No Data Available", genResp.data))
                                                    }
                                                }).catch(error => {
                                                    console.log("Error in getTripsJCA(): " + error.message)
                                                    res.send(new Response(205, SOMETHING_WENT_MSG))
                                                });
                                            }
                                            else {
                                                res.send(new Response(202, "JMTI token regeneration failed", tokenData.data))
                                            }
                                        }).catch(error => {
                                            console.log("Error in tokenValidityRetryForJMTI(): " + error.message)
                                            res.send(new Response(205, SOMETHING_WENT_MSG))
                                        });
                                    }
                                    else {
                                        res.send(new Response(202, "No Data Available", tripsResp.data))
                                    }
                                }).catch(error => {
                                    console.log("Error in getTripsJCA(): " + error.message)
                                    res.send(new Response(205, SOMETHING_WENT_MSG))
                                });
                            }
                            else {
                                res.send(new Response(400, NO_DATA_AVL_MSG));
                            }
                        }).catch(err => {
                            console.log("Error in GetToken(): " + err.message)
                            res.send(new Response(205, "JM API issue"));
                        })
                    }).catch(err => {
                        console.log("Toen generation failed");
                        res.send(new Response(205, "JMTI API issue", ''));
                    }).catch(err => {
                        res.send(new Response(205, err.message, ''));
                    })
                }
                else {
                    res.send(new Response(205, "EnterpriseId not available in JHS", ''));
                }
            })
        }
    } catch (error) {
        let _response: any = new Response(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})
router.post('/vehicle/v1/alerts', async (req, res) => {
    try {
        let body = req.body;
        // console.log(Date.now.toString() + "Request Body is" + JSON.stringify(req.body));
        let apiKey;
        const userid = req.headers.tokenuserid;
        let userName = Token.userName;
        let password = Token.password;
        let enterpriseid = Token.enterpriseid;
        let enterpriseName, secretKey, newApikey;

        //console.log(JSON.stringify(body));

        if (!body.rto_number) {
            res.send(new APIResponse(202, "RTO Number is required"))
        }
        else if (!body.endtime) {
            res.send(new APIResponse(202, "EndTime is required"))
        }
        else {
            // Need to write logic for check token validity
            await tokenValidityForJMTINew(userName, enterpriseid, userid ).then(async (tokenRes:any) => {
                console.log("Token responce from tokenValidityForJMTI: " + JSON.stringify(tokenRes));
                if (tokenRes?.status == 200) {
                    apiKey = tokenRes.data.token;
                    let url = Token.jmtiurl;
                    enterpriseName = tokenRes.data.enterpriseName;
                    secretKey = tokenRes.data.account_Secret;
                    await getAlerts(body, apiKey, url).then(async (alertsResp: any) => {
                        if (alertsResp.status == 200) {
                            console.log("Alert's data is: " + JSON.stringify(alertsResp));
                            res.send(alertsResp.data)
                        } else if (alertsResp.status == 401) {
                            // tokenValidityRetryForJMTI(username, body.enterpriseid, userid).then(async (tokenData: any) => {
                                console.log('Entered into Refresh JMTI Token End Point Is v1/alerts');           
                                console.log('Refresh JMTI Token Parameters..'+"EnterPrise_ID.."+ enterpriseid +", secretKey.." + secretKey + "EnterPrise_Name.." + enterpriseName+ ", UserName.." + userName+ "User ID..." + userid);
                             await refreshTokenForJMTI(enterpriseid,enterpriseName, apiKey, secretKey, userName, userid).then(async (tokenData: any) => {
                                 if (tokenData.status == 200) {
                                     newApikey = tokenData.data.token;
    
                                     await getMotionStatus(body, newApikey, url).then(async (genResp: any) => {
                                         if (genResp.status == 200) {
                                             console.log("V1/Alert data is: " + JSON.stringify(genResp));
                                             res.send(genResp.data)
                                         }
                                         else {
                                             res.send(new Response(202, "No Data Available", genResp.data))
                                         }
                                     }).catch(error => {
                                         console.log("Error in getAlerts():" + error.message);
                                         res.send(new Response(205, SOMETHING_WENT_MSG))
                                     });
                                 }
                                 else {
                                     res.send(new Response(202, "JMTI token regeneration failed", tokenData.data))
                                 }
                             }).catch(error => {
                                 console.log("Error in tokenValidityRetryForJMTI():" + error.message);
                                 res.send(new Response(205, SOMETHING_WENT_MSG))
                             });
                         }
                        else {
                            res.send(new Response(202, "No Data Available"))
                        }
                    }).catch(error => {
                        console.log("Error in inner catch vehicle/v1/alerts getAlerts(): " + error.message);
                        res.send(new Response(205, SOMETHING_WENT_MSG))
                    });
                }
                else {
                    console.log("Error in token result status is not equal to 200");
                    res.send(new Response(400, NO_DATA_AVL_MSG));
                }
            }).catch(err => {
                console.log("Token generation failed...",err.message);
                res.send(new Response(205, "JMTI API issue", ''));
            })   
        }
    } catch (error) {
        console.log("Error in outer catch vehicle/v1/alerts: " + error.message);
        let _response: any = new Response(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})
router.post('/vehicle/v2/alerts', async (req, res) => {
    try {
        let body = req.body;
        let apiKey, newApikey,enterpriseName, secretKey;
        const userid = req.headers.tokenuserid;
        if (!body.rto_number) {
            res.send(new APIResponse(202, "RTO Number is required"))
        }
        else if (!body.endtime) {
            res.send(new APIResponse(202, "EndTime is required"))
        }
        else if (!body.enterpriseid) {
            res.send(new APIResponse(202, ENTERPRISE))
        }
        else {
            // Need to write logic for check token validity
            let responce: any;
            await axios.post(microservicesurl.jca_url + 'JMTI_userDetails', body).then(async result => {
                responce = result.data;
                if (responce.status == 201) {
                    console.log("JHS responce is:" + JSON.stringify(responce));
                    let username = responce.username;
                    let password = responce.password;
                    await tokenValidityForJMTINew(username, body.enterpriseid, userid).then(async (tokenRes: any) => {
                        // let jm_token_respone: any = await tokenValidityForJMToken(body.userName, body.enterpriseid);
                        await GetToken(username, password).then(async (jm_token_respone: any) => {
                            console.log("Token responce from tokenValidityForJMTI: " + JSON.stringify(tokenRes));
                            console.log("Token responce from GetToken: " + JSON.stringify(jm_token_respone));
                            if (tokenRes.status == 200 && jm_token_respone.status == 200) {
                                apiKey = tokenRes.data.token;
                                let JMToken = jm_token_respone.data.access_token;
                                let url = Token.jmtiurl;
                                enterpriseName = tokenRes.data.enterpriseName;
                                secretKey = tokenRes.data.account_Secret;
                                await getAlertsJCA(body, apiKey, url, JMToken).then(async (alertsResp: any) => {
                                    if (alertsResp.status == 200) {
                                        console.log("Alert's data is: " + JSON.stringify(alertsResp.data));
                                        res.send(alertsResp.data)
                                    }
                                    else if (alertsResp.status == 401) {
                                       // tokenValidityRetryForJMTI(username, body.enterpriseid, userid).then(async (tokenData: any) => {
                                        console.log('Entered into Refresh JMTI Token End Point Is v2/alerts');           
                                        await refreshTokenForJMTI(body.enterpriseid,enterpriseName, apiKey, secretKey, username, userid).then(async (tokenData: any) => {
                                            if (tokenData.status == 200) {
                                                newApikey = tokenData.data.token;
                                                await getAlertsJCA(body, newApikey, url, JMToken).then(async (genResp: any) => {
                                                    if (genResp.status == 200) {
                                                        console.log("Alert's data is: " + JSON.stringify(genResp.data));
                                                        res.send(genResp.data)
                                                    }
                                                    else {
                                                        res.send(new Response(202, "No Data Available", genResp.data))
                                                    }
                                                }).catch(error => {
                                                    console.log("Error in getAlertsJCA(): " + error.message);
                                                    res.send(new Response(205, SOMETHING_WENT_MSG))
                                                });
                                            }
                                            else {
                                                res.send(new Response(202, "JMTI token regeneration failed", tokenData.data))
                                            }
                                        }).catch(error => {
                                            console.log("Error in tokenValidityRetryForJMTI(): " + error.message);
                                            res.send(new Response(205, SOMETHING_WENT_MSG))
                                        });
                                    }
                                    else {
                                        res.send(new Response(202, "No Data Available"))
                                    }
                                }).catch(error => {
                                    console.log("Error in outer getAlertsJCA(): " + error.message);
                                    res.send(new Response(205, SOMETHING_WENT_MSG))
                                });
                            }
                            else {
                                res.send(new Response(400, NO_DATA_AVL_MSG));
                            }
                        }).catch(err => {
                            console.log("Error in GetToken(): " + err.message);
                            res.send(new Response(205, "JM API issue"));
                        })
                    }).catch(err => {
                        console.log("Token generation failed : " + err.message);
                        res.send(new Response(205, "JMTI API issue", ''));
                    }).catch(err => {
                        res.send(new Response(205, responce.message, ''));
                    })
                }
                else {
                    res.send(new Response(205, "EnterpriseId not available in JHS", ''));
                }
            })
        }
    } catch (error) {
        let _response: any = new Response(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})
async function tokenValidityForJMTI(username, password, enterpriseid) {
    let resultData: any = {};
    try {
        // return new Promise(async (resolve, reject) => {
        let result: any = {}
        let atoken: any = {};

        let token;
        let expires_in;
        let isExitUserToken: any = await isExitUserLoginForJMTI(username); // need to change
        console.log('Response from mongoDB....', JSON.stringify(isExitUserToken));
        if (isExitUserToken.status == 200) {
            //  let expiresEpoch = Number(isExitUserToken.data.tokens[0].jmtiexpiresin);
            let currentEpoch = Date.now();
            let expiresEpoch: any = new Date(isExitUserToken.data.tokens[0].jmtiexpiresin).valueOf();

            console.log('Response from mongoDB JMTI Token....', isExitUserToken.data.tokens[0].jmtitoken);
            console.log('Response from mongoDB JMTI Token Expires....',isExitUserToken.data.tokens[0].jmtiexpiresin);
            if ((expiresEpoch > currentEpoch) && isExitUserToken.data.tokens[0].jmtitoken != "") {
                token = isExitUserToken.data.tokens[0].jmtitoken,
                    expires_in = Number(isExitUserToken.data.tokens[0].jmtiexpiresin)
            } else {
                await removeTokenForJMTI(username, isExitUserToken.data.tokens[0].jmtitoken);
                // await generateJMTIToken(username, password, enterpriseid).then(async (genTokenResp: any) => {
                //     //// Need to call JIO API
                //     if (genTokenResp.status == 200) {
                //         console.log(Date.now.toString() + "TokenResponce data is: " + JSON.stringify(genTokenResp));
                //         await tokenPushToArrayForJMTI(username, genTokenResp, username);
                //         token = genTokenResp.data.api_key,
                //             expires_in = Number(genTokenResp.data.expires_on)
                //     }
                //     else {
                //         console.log("TokenResponce error data is: " + JSON.stringify(genTokenResp));
                //     }
                // }).catch(error => {
                //     console.log("Error in generateJMTIToken()" + error.message);
                // });


                await generateJMTITokenNew(enterpriseid).then(async (genTokenResp: any) => {
                    if (genTokenResp.status == 200) {
                        console.log(Date.now.toString() + "JMTI TokenResponce data is: " + JSON.stringify(genTokenResp));
                        let tokenDetails = genTokenResp.data;
                        console.log("tokenDetails are: " + JSON.stringify(tokenDetails));
                        let accessToken, accesstokenexpiresEpoch, accesstokendateValue,accountSecret, name, refreshToken, refreshtokenexpiresEpoch, refreshtokendateValue, refresh_expiry;
                        if (tokenDetails.data.keys[0].type.toUpperCase() == "APIKEY") {
                            //Access token expiry time 
                            accessToken = tokenDetails.data.keys[0].value;
                            expires_in = tokenDetails.data.keys[0].expiry.value
                            accountSecret = tokenDetails.data.keys[0]?.account_secret ? tokenDetails.data.keys[0].account_secret : "";
                            name = tokenDetails.data.keys[0]?.name ? tokenDetails.data.keys[0].name : "";
                            if (tokenDetails.data.keys[0].hasOwnProperty("events")) {
                                accesstokendateValue = tokenDetails.data.keys[0].events.updated_on
                                accesstokendateValue = accesstokendateValue.split("T");
                                accesstokendateValue = new Date(accesstokendateValue[0] + " " + accesstokendateValue[1])
                            }
                            else {
                                accesstokendateValue = new Date();
                            }
        
                            if (tokenDetails.data.keys[0].expiry.unit.toUpperCase() == "DAYS") {
                                accesstokenexpiresEpoch = accesstokendateValue.setDate(accesstokendateValue.getDate() + parseInt(expires_in)).valueOf()
                            }
                        }
                        // if (tokenDetails.data.keys[1].hasOwnProperty("type")) {
                        //     if (tokenDetails.data.keys[1].type.toUpperCase() == "REFRESHKEY") {
                        //         //refrsh token expiry time
                        //         refreshToken = tokenDetails.data.keys[1].value;
                        //         refresh_expiry = tokenDetails.data.keys[1].expiry.value
                        //         if (tokenDetails.keys[1].hasOwnProperty("events")) {
                        //             refreshtokendateValue = tokenDetails.data.keys[1].events.updated_on
                        //             refreshtokendateValue = refreshtokendateValue.split("T");
                        //             refreshtokendateValue = new Date(refreshtokendateValue[0] + " " + refreshtokendateValue[1])
                        //         }
                        //         else {
                        //             refreshtokendateValue = new Date();
                        //         }
        
                        //         if (tokenDetails.data.keys[1].expiry.unit.toUpperCase() == "DAYS") {
                        //             refreshtokenexpiresEpoch = refreshtokendateValue.setDate(refreshtokendateValue.getDate() + parseInt(refresh_expiry)).valueOf()
                        //         }
                        //     }
                        // }
                        tokenDetails =
                        {
                            access_token: accessToken,
                            access_token_expires_in: accesstokenexpiresEpoch,
                            account_Secret : accountSecret,
                            enterpriseName : name
                           // refresh_token: refreshToken,
                           // refresh_token_expires_in: refreshtokenexpiresEpoch
                        }
                        await tokenPushToArrayForJMTI(username, tokenDetails, username);
                       // microservicesurl.isRedisCache ? await tokenPushToArrayForJMTIRedis(username, tokenDetails, username, userid) : await tokenPushToArrayForJMTINew(username, tokenDetails, username);
                        // token = genTokenResp.data.keys[0].value,
                        token = tokenDetails.access_token,
                        expires_in = Number(accesstokenexpiresEpoch)
                    }
                    else {
                        console.log("JMTI TokenResponce error data is: " + JSON.stringify(genTokenResp));
                    }
                    resultData.token = token;
                    resultData.expiryIn = expires_in;
                    console.log("Token Responce is tokenValidityRetryForJMTI()" + JSON.stringify(resultData));
                    //  resultData.tokenuserid = userid;
                    return (new Response(200, SUCCESS_MSG, resultData))
                }).catch(error => {
                    console.log("Error in generateJMTIToken()" + error.message);
                });
            }

        } else {
            // await generateJMTIToken(username, password, enterpriseid).then(async (genTokenResp: any) => {
            //     //// Need to call JIO API
            //     if (genTokenResp.status == 200) {
            //         console.log(Date.now.toString() + "TokenResponce data is: " + JSON.stringify(genTokenResp));
            //         await tokenPushToArrayForJMTI(username, genTokenResp, username);
            //         token = genTokenResp.data.data.api_key,
            //             expires_in = genTokenResp.data.data.expires_on
            //     }
            //     else {
            //         console.log("TokenResponce error data is: " + JSON.stringify(genTokenResp));
            //     }
            // }).catch(error => {
            //     console.log("Error in generateJMTIToken()" + error.message);
            // });

            await generateJMTITokenNew(enterpriseid).then(async (genTokenResp: any) => {
                if (genTokenResp.status == 200) {
                    console.log(Date.now.toString() + "JMTI TokenResponce data is: " + JSON.stringify(genTokenResp));
                    let tokenDetails = genTokenResp.data;
                    console.log("tokenDetails are: " + JSON.stringify(tokenDetails));
                    let accessToken, accesstokenexpiresEpoch, accesstokendateValue, refreshToken, refreshtokenexpiresEpoch, refreshtokendateValue, refresh_expiry;
                    if (tokenDetails.data.keys[0].type.toUpperCase() == "APIKEY") {
                        //Access token expiry time 
                        accessToken = tokenDetails.data.keys[0].value;
                        expires_in = tokenDetails.data.keys[0].expiry.value
                        if (tokenDetails.data.keys[0].hasOwnProperty("events")) {
                            accesstokendateValue = tokenDetails.data.keys[0].events.updated_on
                            accesstokendateValue = accesstokendateValue.split("T");
                            accesstokendateValue = new Date(accesstokendateValue[0] + " " + accesstokendateValue[1])
                        }
                        else {
                            accesstokendateValue = new Date();
                        }
    
                        if (tokenDetails.data.keys[0].expiry.unit.toUpperCase() == "DAYS") {
                            accesstokenexpiresEpoch = accesstokendateValue.setDate(accesstokendateValue.getDate() + parseInt(expires_in)).valueOf()
                        }
                    }
                    // if (tokenDetails.data.keys[1].hasOwnProperty("type")) {
                    //     if (tokenDetails.data.keys[1].type.toUpperCase() == "REFRESHKEY") {
                    //         //refrsh token expiry time
                    //         refreshToken = tokenDetails.data.keys[1].value;
                    //         refresh_expiry = tokenDetails.data.keys[1].expiry.value
                    //         if (tokenDetails.keys[1].hasOwnProperty("events")) {
                    //             refreshtokendateValue = tokenDetails.data.keys[1].events.updated_on
                    //             refreshtokendateValue = refreshtokendateValue.split("T");
                    //             refreshtokendateValue = new Date(refreshtokendateValue[0] + " " + refreshtokendateValue[1])
                    //         }
                    //         else {
                    //             refreshtokendateValue = new Date();
                    //         }
    
                    //         if (tokenDetails.data.keys[1].expiry.unit.toUpperCase() == "DAYS") {
                    //             refreshtokenexpiresEpoch = refreshtokendateValue.setDate(refreshtokendateValue.getDate() + parseInt(refresh_expiry)).valueOf()
                    //         }
                    //     }
                    // }
                    tokenDetails =
                    {
                        access_token: accessToken,
                        access_token_expires_in: accesstokenexpiresEpoch,
                       // refresh_token: refreshToken,
                       // refresh_token_expires_in: refreshtokenexpiresEpoch
                    }
                    await tokenPushToArrayForJMTI(username, tokenDetails, username);
                   // microservicesurl.isRedisCache ? await tokenPushToArrayForJMTIRedis(username, tokenDetails, username, userid) : await tokenPushToArrayForJMTINew(username, tokenDetails, username);
                    // token = genTokenResp.data.keys[0].value,
                    token = tokenDetails.access_token,
                        expires_in = Number(accesstokenexpiresEpoch)
                }
                else {
                    console.log("JMTI TokenResponce error data is: " + JSON.stringify(genTokenResp));
                }
                resultData.token = token;
                resultData.expiryIn = expires_in;
                console.log("Token Responce is tokenValidityRetryForJMTI()" + JSON.stringify(resultData));
                //  resultData.tokenuserid = userid;
                return (new Response(200, SUCCESS_MSG, resultData))
            }).catch(error => {
                console.log("Error in generateJMTIToken()" + error.message);
            });
        }
        resultData.token = token;
        resultData.expiryIn = expires_in;
        console.log("Token Responce is tokenValidityForJMTI()" + JSON.stringify(resultData));
        //  resultData.tokenuserid = userid;
        return (new Response(200, SUCCESS_MSG, resultData))
        //  })
    }
    catch (e) {
        console.log("Error in outer catch: " + e.message)
        return (new Response(205, "", resultData))
    }
}
//New function for api change 4.9
async function tokenValidityForJMTINew(username, enterpriseid, userid) {
    let resultData: any = {};
    try {
        // return new Promise(async (resolve, reject) => {
        let token;
        let expires_in;
        let account_Secret;
        let enterpriseName;
        console.log("JMTI User db response")      
        // let isExitUserToken: any = await isExitUserLoginForJMTINew(username); 
        let isExitUserToken: any = microservicesurl.isRedisCache ? await isExitUserLoginForJMTIRedis(userid) : await isExitUserLoginForJMTINew(username);
        if (isExitUserToken.status == 200) {
            let currentEpoch = Date.now();
            let expiresEpoch = isExitUserToken.data.tokens[0].access_token_expires_in
            // let expiresEpoch: any = new Date().valueOf();
            if (expiresEpoch > currentEpoch) {
                    token = isExitUserToken.data.tokens[0].access_token,
                    expires_in = Number(expiresEpoch),
                    enterpriseName = isExitUserToken.data.tokens[0].enterpriseName,
                    account_Secret = isExitUserToken.data.tokens[0].account_Secret
            } else {
                //await removeTokenForJMTINew(username, isExitUserToken.data.tokens[0].access_token)
                console.log('No Data Available in Redis DB.. Entered into Generate JMTI Token Functionality..');
                microservicesurl.isRedisCache ? await removeJMTITokenRedis(userid) : await removeTokenForJMTINew(username, isExitUserToken.data.tokens[0].access_token);
                await generateJMTITokenNew(enterpriseid).then(async (genTokenResp: any) => {
                    if (genTokenResp?.status == 200) {
                        console.log(Date.now.toString() + "JMTI TokenResponce data is: " + JSON.stringify(genTokenResp));
                        let tokenDetails = genTokenResp.data;
                        console.log("tokenDetails are: " + JSON.stringify(tokenDetails));
                        let accessToken, expires_in, accesstokenexpiresEpoch, accesstokendateValue, refreshToken, refreshtokenexpiresEpoch, refreshtokendateValue, refresh_expiry,accountSecret, name;
                        if (tokenDetails.data.keys[0].type.toUpperCase() == "APIKEY") {
                            //Access token expiry time 
                            accessToken = tokenDetails.data.keys[0].value;
                            expires_in = tokenDetails.data.keys[0].expiry.value;
                            accountSecret = tokenDetails.data.keys[0]?.account_secret ? tokenDetails.data.keys[0].account_secret : "";
                            name = tokenDetails.data.keys[0]?.name ? tokenDetails.data.keys[0].name : "";

                            if (tokenDetails.data.keys[0].hasOwnProperty("events")) {
                                accesstokendateValue = tokenDetails.data.keys[0].events.updated_on
                                accesstokendateValue = accesstokendateValue.split("T");
                                accesstokendateValue = new Date(accesstokendateValue[0] + " " + accesstokendateValue[1])
                            }
                            else {
                                accesstokendateValue = new Date();
                            }

                            if (tokenDetails.data.keys[0].expiry.unit.toUpperCase() == "DAYS") {
                                accesstokenexpiresEpoch = accesstokendateValue.setDate(accesstokendateValue.getDate() + parseInt(expires_in)).valueOf()
                            }
                        }
                        if (tokenDetails.data.keys[1].hasOwnProperty("type")) {
                            if (tokenDetails.data.keys[1].type.toUpperCase() == "REFRESHKEY") {
                                //refrsh token expiry time
                                refreshToken = tokenDetails.data.keys[1].value;
                                refresh_expiry = tokenDetails.data.keys[1].expiry.value
                                if (tokenDetails.data.keys[1].hasOwnProperty("events")) {
                                    refreshtokendateValue = tokenDetails.data.keys[1].events.updated_on
                                    refreshtokendateValue = refreshtokendateValue.split("T");
                                    refreshtokendateValue = new Date(refreshtokendateValue[0] + " " + refreshtokendateValue[1])
                                }
                                else {
                                    refreshtokendateValue = new Date();
                                }

                                if (tokenDetails.data.keys[1].expiry.unit.toUpperCase() == "DAYS") {
                                    refreshtokenexpiresEpoch = refreshtokendateValue.setDate(refreshtokendateValue.getDate() + parseInt(refresh_expiry)).valueOf()
                                }
                            }
                        }
                        tokenDetails =
                        {
                            access_token: accessToken,
                            access_token_expires_in: accesstokenexpiresEpoch,
                            refresh_token: refreshToken,
                            refresh_token_expires_in: refreshtokenexpiresEpoch,
                            account_Secret : accountSecret,
                            enterpriseName : name
                        }
                        microservicesurl.isRedisCache ? await tokenPushToArrayForJMTIRedis(username, tokenDetails, username, userid) : await tokenPushToArrayForJMTINew(username, tokenDetails, username);
                        // token = genTokenResp.data.keys[0].value,
                            token = tokenDetails.access_token,
                            expires_in = Number(accesstokenexpiresEpoch),
                            account_Secret = accountSecret,
                            enterpriseName = name

                    }
                    else {
                        console.log("JMTI TokenResponce error data is: " + JSON.stringify(genTokenResp));
                    }
                }).catch(error => {
                    console.log("Error1 in generateJMTIToken()" + error.message);
                });
            }
        } else {
            await generateJMTITokenNew(enterpriseid).then(async (genTokenResp: any) => {
                if (genTokenResp?.status == 200) {
                    console.log(Date.now.toString() + "JMTI TokenResponce data is: " + JSON.stringify(genTokenResp));
                    let tokenDetails = genTokenResp.data;
                    console.log("tokenDetails are: " + JSON.stringify(tokenDetails));
                    let accessToken, expires_in, accesstokenexpiresEpoch, accesstokendateValue, refreshToken, refreshtokenexpiresEpoch, refreshtokendateValue, refresh_expiry,accountSecret, name;
                    if (tokenDetails.data.keys[0].type.toUpperCase() == "APIKEY") {
                        //Access token expiry time 
                        accessToken = tokenDetails.data.keys[0].value;
                        expires_in = tokenDetails.data.keys[0].expiry.value;
                        accountSecret = tokenDetails.data.keys[0]?.account_secret ? tokenDetails.data.keys[0].account_secret : "";
                        name = tokenDetails.data.keys[0]?.name ? tokenDetails.data.keys[0].name : "";

                        if (tokenDetails.data.keys[0].hasOwnProperty("events")) {
                            accesstokendateValue = tokenDetails.data.keys[0].events.updated_on
                            accesstokendateValue = accesstokendateValue.split("T");
                            accesstokendateValue = new Date(accesstokendateValue[0] + " " + accesstokendateValue[1])
                        }
                        else {
                            accesstokendateValue = new Date();
                        }

                        if (tokenDetails.data.keys[0].expiry.unit.toUpperCase() == "DAYS") {
                            accesstokenexpiresEpoch = accesstokendateValue.setDate(accesstokendateValue.getDate() + parseInt(expires_in)).valueOf()
                        }
                    }
                    if (tokenDetails.data.keys[1].hasOwnProperty("type")) {
                        if (tokenDetails.data.keys[1].type.toUpperCase() == "REFRESHKEY") {
                            //refrsh token expiry time
                            refresh_expiry = tokenDetails.data.keys[1].expiry.value
                            refreshToken = tokenDetails.data.keys[1].value;
                            if (tokenDetails.data.keys[1].hasOwnProperty("events")) {
                                refreshtokendateValue = tokenDetails.data.keys[1].events.updated_on
                                refreshtokendateValue = refreshtokendateValue.split("T");
                                refreshtokendateValue = new Date(refreshtokendateValue[0] + " " + refreshtokendateValue[1])
                            }
                            else {
                                refreshtokendateValue = new Date();
                            }
                            if (tokenDetails.data.keys[1].expiry.unit.toUpperCase() == "DAYS") {
                                refreshtokenexpiresEpoch = refreshtokendateValue.setDate(refreshtokendateValue.getDate() + parseInt(refresh_expiry)).valueOf()
                            }
                        }
                    }

                    tokenDetails = {
                        access_token: accessToken,
                        access_token_expires_in: accesstokenexpiresEpoch,
                        refresh_token: refreshToken,
                        refresh_token_expires_in: refreshtokenexpiresEpoch,
                        account_Secret : accountSecret,
                        enterpriseName : name,
                    }
                    console.log("token details for db", tokenDetails);
                    microservicesurl.isRedisCache ? await tokenPushToArrayForJMTIRedis(username, tokenDetails, username, userid) : await tokenPushToArrayForJMTINew(username, tokenDetails, username);
                        token = tokenDetails.access_token,
                        expires_in = Number(accesstokenexpiresEpoch),
                        account_Secret = accountSecret,
                        enterpriseName = name
                }
                else {
                    console.log("TokenResponce error data is: " + JSON.stringify(genTokenResp));
                }
            }).catch(error => {
                console.log("Error2 in generateJMTIToken()" + error.message);
            });
        }
        resultData.token = token;
        resultData.expiryIn = expires_in;
        resultData.account_Secret = account_Secret;
        resultData.enterpriseName = enterpriseName;
    

        console.log("Token Responce is tokenValidityForJMTI()" + JSON.stringify(resultData));
        //  resultData.tokenuserid = userid;
        return (new Response(200, SUCCESS_MSG, resultData))
        //  })
    }
    catch (e) {
        return (new Response(205, "", resultData))
    }
}
//4.9 feature
async function tokenValidityForJMToken(username, password) {
    let resultData: any = {};
    try {
        // return new Promise(async (resolve, reject) => {
        let token;
        let expires_in;
        let isExitUserToken: any = await isExitUserLoginForJMToken(username);

        if (isExitUserToken.data.status == 200) {
            let currentEpoch = Date.now();

            isExitUserToken = isExitUserToken.data
            // let expiresEpoch: any = isExitUserToken.data.tokens[0].expires_in
            // if ((expiresEpoch > currentEpoch) && isExitUserToken.data.tokens[0].access_token != "") {               
            //     token = isExitUserToken.data.tokens[0].access_token,
            //         expires_in = Number(isExitUserToken.data.tokens[0].expires_in)
            // } else {               
            await removeTokenForJM(username, isExitUserToken.access_token);
            await generateJMToken(username, password).then(async (genTokenResp: any) => {
                if (genTokenResp.status == 200) {
                    //Need to check expiry time from api response weather it is days or hours !
                    console.log(Date.now.toString() + " JM TokenResponce data is: " + JSON.stringify(genTokenResp));
                    await tokenPushToArrayForJMToken(username, genTokenResp.data, username);
                    token = genTokenResp.data.access_token,
                        expires_in = Number(genTokenResp.data.expires_in)
                }
                else {
                    console.log("TokenResponce error data is: " + JSON.stringify(genTokenResp));
                }
            }).catch(error => {
                console.log("Error in generateJMToken()" + error.message);

            });
            // }
        }
        else {
            console.log("db res1", isExitUserToken.data);

            await generateJMToken(username, password).then(async (genTokenResp: any) => {
                console.log("generate token res", genTokenResp.data);
                if (genTokenResp.status == 200) {
                    console.log(Date.now.toString() + "TokenResponce data is: " + JSON.stringify(genTokenResp.data));

                    //Need to calculate and add expiry time

                    await tokenPushToArrayForJMToken(username, genTokenResp.data, username);
                    token = genTokenResp.data.access_token,
                        expires_in = genTokenResp.data.expires_in
                }
                else {
                    console.log("JM Token Responce error data is: " + JSON.stringify(genTokenResp));

                }
            }).catch(error => {
                console.log("Error in generateJMToken()" + error.message);
            });
        }
        resultData.token = token;
        resultData.expiryIn = expires_in;
        console.log(" JM Token Responce is tokenValidityForJM()" + JSON.stringify(resultData));

        return (new Response(200, SUCCESS_MSG, resultData))
        // })
    }
    catch (e) {
        return (new Response(205, "", resultData))
    }
}
async function generateJMTIToken(username, password, enterpriseid) {
    try {
        return new Promise(async (resolve, reject) => {
            let jsonString = {
                "data": {
                    "enterpriseId": enterpriseid, // need to ask enterpriseId
                    "username": username,
                    "password": password,
                    "serviceType": "data_query"
                }
            }
            let url = Token.jmtienterpriseurl

            console.log("Token request is: " + JSON.stringify(jsonString));
            console.log("Token URL is: " + url + "/access/v1/api_key/get");
            const headers = {
                'Content-Type': 'application/json',
                timeout: 50000
            }
            await axios.post(url + "/access/v1/api_key/get", jsonString, {
                headers: headers,
                // proxy:false
            }).then(async (result: any) => {
                console.log("Token result is " + JSON.stringify(result.data));
                if (result.data) {
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    resolve({ status: 204, message: "" })
                }
            }).catch(error => {
                console.log("Error in inner catch generateJMTIToken(): " + error.message);
                // return resolve(new JIOToken(204, ""))
                resolve({ status: 204, message: "" })
            });
        })
    }
    catch (e) {
        console.log("Error in outer catch generateJMTIToken(): " + e.message);
        return (new JIOToken(205, {}))
    }
}
//4.9 api changes
async function generateJMTITokenNew(enterpriseid) {
    try {
        return new Promise(async (resolve, reject) => {
            let jsonString = {
                "data": {
                    "enterprise_id": enterpriseid,
                }
            }
            let url = Token.jmtienterpriseurl

            console.log("Token request is: " + JSON.stringify(jsonString));
            console.log("Token URL is: " + url + "/enterprises/access_details/v1/get");
            const headers = {
                'Content-Type': 'application/json',
                'ApiKey': Token.jmtiadminkey
            }
            await axios.post(url + "/enterprises/access_details/v1/get", jsonString, {
                headers: headers,
                // proxy:false
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("JMTI Token result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("Error in JMTI token  " + result);
                    resolve({ status: 204, message: "" })
                }
            }).catch(error => {
                console.log("Error in JMTI token catch " + error.message);
                // return resolve(new JIOToken(204, ""))
                resolve({ status: 204, message: "" })
            });
        })
    }
    catch (e) {
        console.log("Error in JMTI token final catch " + e.message);
        return (new JIOToken(205, {}))
    }
}
//4.9 api changes
async function generateJMToken(username, password) {
    try {
        return new Promise(async (resolve, reject) => {
            var params = new URLSearchParams()
            params.append('username', username)
            params.append('password', password)
            params.append('grant_type', "password")
            params.append('client_id', "apiOne")
            params.append('client_secrete', "apiOne")

            let url = Token.jioapi

            console.log(" JM Token request is: " + params);
            console.log("JM Token URL is: " + url + "/oauth/token");
            const headers = {
                'Content-Type': 'application/json',
            }
            await axios.post(url + "/oauth/token", params, {
                headers: headers,
                // proxy:false
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("JM Token result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    resolve({ status: 204, message: "" })
                }
            }).catch(error => {
                // return resolve(new JIOToken(204, ""))
                resolve({ status: 204, message: "" })
            });
            // let result = { data:{
            //     "access_token": "fb5cbb20-6bfa-40d5-aabd-8a30e4e852a4",
            //     "token_type": "bearer",
            //     "refresh_token": "1b1e8289-95f0-4d50-acc5-91e0e4e26d6d",
            //     "expires_in": 406}
            // }
            // resolve({ status: 200, message: "Success", data: result.data })  

        })
    }
    catch (e) {
        return (new JIOToken(205, {}))
    }
}
async function getattributes(bodyData, tokenkey, urlValue) {
    let body = bodyData;
    let token = tokenkey;
    let url = urlValue;
    try {
        return new Promise(async (resolve, reject) => {
            let jsonString = {
                "rto_number": body.rto_number,
                "attributes": body.attributes,
                "starttime": body.starttime,
                "endtime": body.endtime,
                "offset": body.offset,
                "limit": body.limit
            }
            //let url = Token.jiodatamanagementapi
            const headers = {
                'Content-Type': 'application/json',
                'ApiKey': token,
                timeout: 50000
            }
            console.log("Attribute request is: " + JSON.stringify(jsonString));
            console.log("Attribute URL is: " + url + "/vehicle/attributes/v1/get");
            console.log("Attribute Headers is: " + JSON.stringify(headers));

            // return new Promise(async (resolve, reject) => {
            await axios.post(url + "/vehicle/attributes/v1/get", jsonString, {
                headers: headers
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("V1 Attribute result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("Error in V1 Attributes API");
                    resolve({ status: 201, message: "No Data Available" })
                }
            }).catch(error => {
                if (error?.response?.status == 401) {
                    resolve({ status: 401, message: SOMETHING_WENT_MSG })
                } else{
                    console.log("Error in inner catch getattributes(): " + error.message);
                    resolve({ status: 201, message: "No Data Available" })
                }
            });

        })

    }
    catch (e) {
        console.log("Error in outer catch getattributes(): " + e.message);
        return (new JIOToken(205, {}))
    }
}
async function getattributesJCA(bodyData, tokenkey, urlValue, JMToken) {
    let body = bodyData;
    let token = tokenkey;
    let url = urlValue;
    try {
        return new Promise(async (resolve, reject) => {
            let jsonString = {
                "rto_number": body.rto_number,
                "enterprise_id": body.enterpriseid,
                "attributes": body.attributes,
                "starttime": body.starttime,
                "endtime": body.endtime,
                "offset": body.offset,
                "limit": body.limit
            }
            //let url = Token.jiodatamanagementapi
            const headers = {
                'Content-Type': 'application/json',
                'apiKey': token,
                'JMToken': JMToken,
                timeout: 50000
            }
            console.log("Attribute request is: " + JSON.stringify(jsonString));
            console.log("Attribute URL is: " + url + "/vehicle/attributes/v2/get");
            console.log("Attribute Headers is: " + JSON.stringify(headers));
            // return new Promise(async (resolve, reject) => {
            await axios.post(url + "/vehicle/attributes/v2/get", jsonString, {
                headers: headers
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("V2 Attribute result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("Error in  V2 Attributes API");
                    resolve({ status: 201, message: "No Data Available" })
                }
            }).catch(error => {
                // Need to write JMTI token api logic
                if (error?.response?.status == 401) {
                    resolve({ status: 401, message: SOMETHING_WENT_MSG })
                }
                else {
                    console.log("Error in inner catch getattributesJCA()" + error.message);
                    resolve({ status: 201, message: SOMETHING_WENT_MSG })
                }

            });

        })

    }
    catch (e) {
        console.log("Error in final catch getattributesJCA()" + e.message);
        return (new JIOToken(205, {}))
    }
}
async function getMotionStatus(bodyData, tokenkey, urlValue) {
    let body = bodyData;
    let token = tokenkey;
    let url = urlValue;
    try {
        return new Promise(async (resolve, reject) => {

            let jsonString = {
                "rto_number": body.rto_number
            }
            // let url = Token.jiodatamanagementapi
            const headers = {
                'Content-Type': 'application/json',
                'ApiKey': token,
                timeout: 50000
            }

            console.log("Motion request is: " + JSON.stringify(jsonString));
            console.log("Motion URL is: " + url + "/vehicle/motion_status/v1/get");
            console.log("Motion status Headers is: " + JSON.stringify(headers));

            //return new Promise(async (resolve, reject) => {
            await axios.post(url + "/vehicle/motion_status/v1/get", jsonString, {
                headers: headers
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("V1 MotionStatus result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("Error in V1 Motion API");
                    //res.send(new details(201, "No Data Available"));
                    resolve({ status: 201, message: "No Data Available" })
                }
            }).catch(error => {

                if (error?.response?.status == 401) {
                    resolve({ status: 401, message: SOMETHING_WENT_MSG })
                } else{
                    console.log("Error in inner catch getMotionStatus(): " + error.message);
                    resolve({ status: 201, message: "No Data Available" })
                }
            });

        })

    }
    catch (e) {
        console.log("Error in outer catch getMotionStatus(): " + e.message);
        return (new JIOToken(205, {}))
    }
}
async function getMotionStatusJCA(bodyData, tokenkey, urlValue, JMToken) {
    let body = bodyData;
    let token = tokenkey;
    let url = urlValue;
    try {
        return new Promise(async (resolve, reject) => {

            let jsonString = {
                "rto_number": body.rto_number,
                "enterprise_id": body.enterpriseid
            }
            // let url = Token.jiodatamanagementapi
            const headers = {
                'Content-Type': 'application/json',
                'ApiKey': token,
                'JMToken': JMToken,
                timeout: 50000
            }

            console.log("Motion request is: " + JSON.stringify(jsonString));
            console.log("Motion URL is: " + url + "/vehicle/motion_status/v2/get");
            console.log("Motion Headers is: " + JSON.stringify(headers));

            //return new Promise(async (resolve, reject) => {
            await axios.post(url + "/vehicle/motion_status/v2/get", jsonString, {
                headers: headers
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("V2 MotionStatus result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    //res.send(new details(201, "No Data Available"));
                    console.log("Error in V2 MotionStatus API" + result);
                    resolve({ status: 201, message: "No Data Available", data: result.data })
                }
            }).catch(error => {
                // console.log("Error in V2 MotionStatus catch" + error.message);
                // resolve({ status: 201, message: SOMETHING_WENT_MSG })
                console.log(JSON.stringify(error));
                console.log("New Result is :" + JSON.stringify(error));
                if (error?.response?.status == 401) {
                    resolve({ status: 401, message: SOMETHING_WENT_MSG })
                }
                else {
                    console.log("Error in V2 MotionStatus catch" + error.message);
                    resolve({ status: 201, message: SOMETHING_WENT_MSG })
                }
            });

        })

    }
    catch (e) {
        console.log("Error in V2 MotionStatus final catch" + e.message);
        return (new JIOToken(205, {}))
    }
}
async function getTrips(bodyData, tokenkey, urlValue) {
    let body = bodyData;
    let token = tokenkey;
    let url = urlValue;
    try {
        return new Promise(async (resolve, reject) => {

            let jsonString = {
                "rto_number": body.rto_number,
                "starttime": body.starttime,
                "endtime": body.endtime,
                "offset": body.offset,
                "tripStatus": body.tripStatus,
                "limit": body.limit// need to ask (api document not available)
            }
            // let url = Token.jiodatamanagementapi
            const headers = {
                'Content-Type': 'application/json',
                'ApiKey': token,
                timeout: 50000
            }

            console.log("Trips request is: " + JSON.stringify(jsonString));
            console.log("Trips URL is: " + url + "/vehicle/trips/v1/get");
            console.log("Trips Headers is: " + JSON.stringify(headers));

            // return new Promise(async (resolve, reject) => {
            await axios.post(url + "/vehicle/trips/v1/get", jsonString, {
                headers: headers
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("V1 Trips result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("Error in V1 Trips API");
                    resolve({ status: 201, message: "No Data Available" })
                }
            }).catch(error => {
                if (error?.response?.status == 401) {
                    resolve({ status: 401, message: SOMETHING_WENT_MSG })
                } else{
                    console.log("Error in inner catch getTrips(): " + error.message);
                    resolve({ status: 201, message: "No Data Available" })
                }
            });

        })

    }
    catch (e) {
        console.log("Error in outer catch getTrips(): " + e.message);
        return (new JIOToken(205, {}))
    }
}
async function getTripsJCA(bodyData, tokenkey, urlValue, JMToken) {
    let body = bodyData;
    let token = tokenkey;
    let url = urlValue;
    try {
        return new Promise(async (resolve, reject) => {

            let jsonString = {
                "rto_number": body.rto_number,
                "enterprise_id": body.enterpriseid,
                "starttime": body.starttime,
                "endtime": body.endtime,
                "offset": body.offset,
                "tripStatus": body.tripStatus,
                "limit": body.limit// need to ask (api document not available)
            }
            // let url = Token.jiodatamanagementapi
            const headers = {
                'Content-Type': 'application/json',
                'ApiKey': token,
                'JMToken': JMToken,
                timeout: 50000
            }

            console.log("Trips request is: " + JSON.stringify(jsonString));
            console.log("Trips URL is: " + url + "/vehicle/trips/v2/get");
            console.log("Trips Headers is: " + JSON.stringify(headers));

            // return new Promise(async (resolve, reject) => {
            await axios.post(url + "/vehicle/trips/v2/get", jsonString, {
                headers: headers
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("V2 Trips result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("Error in V2 Trips API" + result);
                    resolve({ status: 201, message: "No Data Available", data: result.data })
                }
            }).catch(error => {
                // console.log("Error in V2 Trips catch " + error.message);
                // resolve({ status: 201, message: SOMETHING_WENT_MSG })

                if (error?.response?.status == 401) {
                    resolve({ status: 401, message: SOMETHING_WENT_MSG })
                }
                else {
                    console.log("Error in V2 Trips catch " + error.message);
                    resolve({ status: 201, message: SOMETHING_WENT_MSG })
                }
            });

        })

    }
    catch (e) {
        console.log("Error in V2 Trips final catch " + e.message);
        return (new JIOToken(205, {}))
    }
}
async function getAlerts(bodyData, tokenkey, urlValue) {
    let body = bodyData;
    let token = tokenkey;
    let url = urlValue;
    let alertsArray: any = body.alerttypes
    console.log("Entered in to getAlerts()");
    console.log("Body Data is: " + bodyData);
    try {
        let alerts: any = [];
        return new Promise(async (resolve, reject) => {
            //if (body.alerttypes) {
            alertsArray.forEach(element => {
                let alert: any = {
                    "alert_type": element
                }
                alerts.push(alert);
            });
            // }
            console.log(JSON.stringify(alerts));
            let jsonString: any = {
                "rto_number": body.rto_number,
                "conditions": {
                    "or": alerts
                },
                "starttime": body.starttime,
                "endtime": body.endtime,
                "offset": body.offset,
                "limit": body.limit // need to ask (api document not available)
            }
            // let url = Token.jiodatamanagementapi
            const headers = {
                'Content-Type': 'application/json',
                'ApiKey': token,
                timeout: 50000
            }

            console.log("Alerts request is: " + JSON.stringify(jsonString));
            console.log("Alerts URL is: " + url + "/vehicle/alerts/v1/get");
            console.log("Alerts Headers is: " + JSON.stringify(headers));

            //return new Promise(async (resolve, reject) => {
            await axios.post(url + "/vehicle/alerts/v1/get", jsonString, {
                headers: headers
            }).then(async (result: any) => {
                if (result.data) {
                    // console.log("Alerts result is " + JSON.stringify(result.data));
                    console.log("V1 Alerts result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("Error in V1 Alerts API" + result);
                    resolve({ status: 201, message: "No Data Available" })
                }
            }).catch(error => {
                // console.log("Error in  inner catch getAlerts(): " + error.message);
                // resolve({ status: 201, message: "No Data Available" })

                if (error?.response?.status == 401) {
                    resolve({ status: 401, message: SOMETHING_WENT_MSG })
                }
                else {
                    console.log("Error in V1 Alerts API catch " + error.message);
                    resolve({ status: 201, message: SOMETHING_WENT_MSG })
                }
            });
        })

    }
    catch (e) {
        console.log("Error in  outer catch getAlerts(): " + e.message);
        return (new JIOToken(205, {}))
    }
}
async function getAlertsJCA(bodyData, tokenkey, urlValue, JMToken) {
    let body = bodyData;
    let token = tokenkey;
    let url = urlValue;
    let jsonString: any

    console.log("Entered in to getAlerts()");
    console.log("Body Data is: " + bodyData);
    try {
        let alerts: any = [];
        return new Promise(async (resolve, reject) => {
            //if (body.alerttypes) {
            if (body.hasOwnProperty('alerttypes')) {
                let alertsArray: any = body.alerttypes
                console.log("alertsarray length is" + alertsArray.length)
                if (alertsArray.length > 0) {
                    alertsArray.forEach(element => {
                        if (element != "") {
                            let alert: any = {
                                "alert_type": element
                            }
                            alerts.push(alert);
                        }
                    });
                }
                // }
                if (alerts.length > 0) {
                    console.log(JSON.stringify(alerts));
                    jsonString = {
                        "rto_number": body.rto_number,
                        "enterprise_id": body.enterpriseid,
                        "conditions": {
                            "or": alerts
                        },
                        "starttime": body.starttime,
                        "endtime": body.endtime,
                        "offset": body.offset,
                        "limit": body.limit // need to ask (api document not available)
                    }
                }
                else {
                    jsonString = {
                        "rto_number": body.rto_number,
                        "enterprise_id": body.enterpriseid,
                        "starttime": body.starttime,
                        "endtime": body.endtime,
                        "offset": body.offset,
                        "limit": body.limit // need to ask (api document not available)
                    }
                }
            }
            else {
                jsonString = {
                    "rto_number": body.rto_number,
                    "enterprise_id": body.enterpriseid,
                    "starttime": body.starttime,
                    "endtime": body.endtime,
                    "offset": body.offset,
                    "limit": body.limit // need to ask (api document not available)
                }
            }
            // let url = Token.jiodatamanagementapi
            const headers = {
                'Content-Type': 'application/json',
                'ApiKey': token,
                'JMToken': JMToken,
                timeout: 50000
            }

            console.log("Alerts request is: " + JSON.stringify(jsonString));
            console.log("Alerts URL is: " + url + "/vehicle/alerts/v2/get");
            console.log("Alerts Headers is: " + JSON.stringify(headers));

            //return new Promise(async (resolve, reject) => {
            await axios.post(url + "/vehicle/alerts/v2/get", jsonString, {
                headers: headers
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("V2 Alerts result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("Error in V2 Alerts API" + result);
                    resolve({ status: 201, message: "No Data Available", data: result.data })
                }
            }).catch(error => {

                // console.log("Error in V2 alerts catch " + error.message);
                // resolve({ status: 201, message: "No Data Available" })

                if (error?.response?.status == 401) {
                    resolve({ status: 401, message: SOMETHING_WENT_MSG })
                }
                else {
                    console.log("Error in V2 alerts catch " + error.message);
                    resolve({ status: 201, message: SOMETHING_WENT_MSG })
                }
            });

        })

    }
    catch (e) {
        console.log("Error in V2 alerts final catch " + e.message);
        return (new JIOToken(205, {}))
    }
}
router.post('/v1/cargoTrip', async (req, res) => {
    try {
        let body = req.body;
        if (!body.userid) {
            res.send(new APIResponse(202, userIdMsg))
        }
        else if (!body.fromDate) {
            res.send(new APIResponse(202, FROM_DATE_MSG))
        }
        else if (!body.toDate) {
            res.send(new APIResponse(202, TO_DATE_MSG))
        }
        else if (body.vehicleNumbers.length < 1 || (body.vehicleNumbers.length == 1 && body.vehicleNumbers[0] == '')) {
            res.send(new APIResponse(202, registrationMsg))
        }
        else {
            if (req.headers.adminemailid.toUpperCase() == body.userid.toUpperCase()) {
                let jsonbody = { body: body }
                await axios.post(microservicesurl.jca_url + 'v1/cargoTrip', jsonbody).then(async result => {
                    res.send(result.data)
                }).catch(error => {
                    console.log("Error in inner catch v1/cargoTrip: " + error.message);
                    res.send(new Response(205, SOMETHING_WENT_MSG))
                })
            }
            else {
                res.send(new APIResponse(202, "Unauthorized User"));
            }
        }
    } catch (error) {
        console.log("Error in outer catch v1/cargoTrip: " + error.message);
        res.send(new Response(205, SOMETHING_WENT_MSG));
    }
})
router.post('/v1/cargoTripDetails', async (req, res) => {
    try {
        let body = req.body;

        if (!body.tripid && !body.referenceid) {
            res.send(new APIResponse(202, tripIdMsg))
        }
        else if (!body.tripid) {
            res.send(new APIResponse(202, tripId))
        }
        else {
            let reqbody = {
                adminemailid: req.headers.adminemailid,
                bookingid: body.tripid,
                userid : req.headers.tokenuserid
            }
            await axios.post(microservicesurl.booking + 'getAuthorizationforBooking', reqbody).then(async verifyTrip => {
                if (verifyTrip.data.status == 200) {
                    let jsonbody = { body: body }
                    await axios.post(microservicesurl.jca_url + 'v1/cargoTripDetails', jsonbody).then(async result => {
                        res.send(result.data)
                    }).catch(error => {
                        console.log("Error in inner catch v1/cargoTripDetails: " + error.message);
                        res.send(new Response(205, SOMETHING_WENT_MSG))
                    })
                }
                else {
                    res.send(verifyTrip.data);
                }
            }).catch(error => {
                console.log("Error in catch getAuthorizationforBooking: " + error.message);
                res.send(new Response(205, SOMETHING_WENT_MSG));
            });
        }
    } catch (error) {
        console.log("Error in outer catch v1/cargoTripDetails: " + error.message);
        res.send(new Response(205, SOMETHING_WENT_MSG));
    }
})

router.post('/v2/cargoTrip', async (req, res) => {
    try {
        let body = req.body;
        if (!body.userid) {
            res.send(new APIResponse(202, userIdMsg))
        }
        else if (!body.fromDate) {
            res.send(new APIResponse(202, FROM_DATE_MSG))
        }
        else if (!body.toDate) {
            res.send(new APIResponse(202, TO_DATE_MSG))
        }
        else if (body.vehicleNumbers.length < 1 || (body.vehicleNumbers.length == 1 && body.vehicleNumbers[0] == '')) {
            res.send(new APIResponse(202, registrationMsg))
        }

        else {
            if (req.headers.adminemailid.toUpperCase() == body.userid.toUpperCase()) {
                let jsonbody = { body: body }
                await axios.post(microservicesurl.jca_url + 'v2/cargoTrip', jsonbody).then(async result => {
                    res.send(result.data)
                }).catch(error => {
                    console.log("Error in internal catch v2/cargoTrip: " + error.message);
                    res.send(new Response(205, SOMETHING_WENT_MSG))
                })
            }
            else {
                res.send(new APIResponse(202, "Unauthorized User"));
            }
        }
    } catch (error) {
        console.log("Error in outer catch v2/cargoTrip: " + error.message);
        res.send(new Response(205, SOMETHING_WENT_MSG));
    }
})

router.post('/v2/cargoTripDetails', async (req, res) => {
    try {
        let body = req.body;

        if (!body.tripid && !body.referenceid) {
            res.send(new APIResponse(202, tripIdMsg))
        }
        else if (!body.tripid) {
            res.send(new APIResponse(202, tripId))
        }
        else {
            let reqbody = {
                adminemailid: req.headers.adminemailid,
                bookingid: body.tripid,
                userid: req.headers.tokenuserid
            }
            await axios.post(microservicesurl.booking + 'getAuthorizationforBooking', reqbody).then(async verifyTrip => {
                if (verifyTrip.data.status == 200) {
                    let jsonbody = { body: body }
                    await axios.post(microservicesurl.jca_url + 'v2/cargoTripDetails', jsonbody).then(async result => {
                        res.send(result.data)
                    }).catch(error => {
                        console.log("Error in inner catch v2/cargoTripDetails: " + error.message);
                        res.send(new Response(205, SOMETHING_WENT_MSG))
                    })
                }
                else {
                    res.send(verifyTrip.data);
                }
            }).catch(error => {
                console.log("Error in catch getAuthorizationforBooking: " + error.message);
                res.send(new Response(205, SOMETHING_WENT_MSG));
            });
        }
    } catch (error) {
        console.log("Error in outer catch v2/cargoTripDetails: " + error.message);
        res.send(new Response(205, SOMETHING_WENT_MSG));
    }
})

async function GetToken(username, password) {
    try {
        return new Promise(async (resolve, reject) => {
            // let jsonString = "username=" + username + "&password=" + password + "&grant_type=password&client_secret=apiOne&client_id=apiOne";
            let jsonString = "username=" + username + "&password=" + password + "&grant_type=password&client_secret=apiOne&client_id=apiOne";
            let url = Token.jioapi
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            console.log("JM Url is :" + url + "/oauth/token");
            await axios.post(url + "/oauth/token", jsonString, {
                headers: headers,
                timeout: 50000
            }).then(result => {
                if (result.data) {
                    console.log("JM result is :" + JSON.stringify(result.data))
                    return resolve(new JIOToken(200, result.data))
                }
                else {
                    console.log("Error in JM API" + result);
                    return resolve(new JIOToken(204, ""))
                }
            }).catch(error => {
                console.log("Catch error" + error.message);
                return resolve(new JIOToken(205, ""))
            });
        })
    }
    catch (e) {
        console.log("Final Catch error" + e.message);
        return (new JIOToken(205, {}))
    }
}

async function tokenValidityRetryForJMTI(username, enterpriseid, userid) {
    let resultData: any = {};
    try {
        let token;
        let expires_in;
        await generateJMTITokenNew(enterpriseid).then(async (genTokenResp: any) => {
            if (genTokenResp.status == 200) {
                console.log(Date.now.toString() + "JMTI TokenResponce data is: " + JSON.stringify(genTokenResp));
                let tokenDetails = genTokenResp.data;
                console.log("tokenDetails are: " + JSON.stringify(tokenDetails));
                let accessToken, accesstokenexpiresEpoch, accesstokendateValue, refreshToken, refreshtokenexpiresEpoch, refreshtokendateValue, refresh_expiry;
                if (tokenDetails.data.keys[0].type.toUpperCase() == "APIKEY") {
                    //Access token expiry time 
                    accessToken = tokenDetails.data.keys[0].value;
                    expires_in = tokenDetails.data.keys[0].expiry.value
                    if (tokenDetails.data.keys[0].hasOwnProperty("events")) {
                        accesstokendateValue = tokenDetails.data.keys[0].events.updated_on
                        accesstokendateValue = accesstokendateValue.split("T");
                        accesstokendateValue = new Date(accesstokendateValue[0] + " " + accesstokendateValue[1])
                    }
                    else {
                        accesstokendateValue = new Date();
                    }

                    if (tokenDetails.data.keys[0].expiry.unit.toUpperCase() == "DAYS") {
                        accesstokenexpiresEpoch = accesstokendateValue.setDate(accesstokendateValue.getDate() + parseInt(expires_in)).valueOf()
                    }
                }
                if (tokenDetails.data.keys[1].hasOwnProperty("type")) {
                    if (tokenDetails.data.keys[1].type.toUpperCase() == "REFRESHKEY") {
                        //refrsh token expiry time
                        refreshToken = tokenDetails.data.keys[1].value;
                        refresh_expiry = tokenDetails.data.keys[1].expiry.value
                        if (tokenDetails.keys[1].hasOwnProperty("events")) {
                            refreshtokendateValue = tokenDetails.data.keys[1].events.updated_on
                            refreshtokendateValue = refreshtokendateValue.split("T");
                            refreshtokendateValue = new Date(refreshtokendateValue[0] + " " + refreshtokendateValue[1])
                        }
                        else {
                            refreshtokendateValue = new Date();
                        }

                        if (tokenDetails.data.keys[1].expiry.unit.toUpperCase() == "DAYS") {
                            refreshtokenexpiresEpoch = refreshtokendateValue.setDate(refreshtokendateValue.getDate() + parseInt(refresh_expiry)).valueOf()
                        }
                    }
                }
                tokenDetails =
                {
                    access_token: accessToken,
                    access_token_expires_in: accesstokenexpiresEpoch,
                    refresh_token: refreshToken,
                    refresh_token_expires_in: refreshtokenexpiresEpoch
                }
                microservicesurl.isRedisCache ? await tokenPushToArrayForJMTIRedis(username, tokenDetails, username, userid) : await tokenPushToArrayForJMTINew(username, tokenDetails, username);
                // token = genTokenResp.data.keys[0].value,
                token = tokenDetails.access_token,
                    expires_in = Number(accesstokenexpiresEpoch)
            }
            else {
                console.log("JMTI TokenResponce error data is: " + JSON.stringify(genTokenResp));
            }
            resultData.token = token;
            resultData.expiryIn = expires_in;
            console.log("Token Responce is tokenValidityRetryForJMTI()" + JSON.stringify(resultData));
            //  resultData.tokenuserid = userid;
            return (new Response(200, SUCCESS_MSG, resultData))
        }).catch(error => {
            console.log("Error3 in generateJMTIToken()" + error.message);
        });
    }
    catch (e) {
        return (new Response(205, "", resultData))
    }
}

router.post('/v2/SendConsentForSIM', async (req, res) => {
    try {
        let body = req.body;
        if (!body.drivername) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverName(body.drivername)) {
            res.send(new APIResponse(202, INVALID_DRIVER_NAME))
        }
        else if (!body.drivermobile) {
            res.send(new APIResponse(202, MANDATORY_ERROR_MSG))
        }
        else if (!isValidDriverMNO(body.drivermobile)) {
            res.send(new APIResponse(202, INVALID_DRIVER_MNO))
        }
        else {
            let obj: any;
            await axios.post(microservicesurl.jca_url + 'getClientVehdata_DriverConcent', body).then(async result => {
                console.log("Result data for mysql: " + JSON.stringify(result.data));
                if (result.data.status == 200) {
                    result.data.data['driverMno'] = body.drivermobile;
                    result.data.data['driverName'] = body.drivername;

                    obj = await doSIMRegistration(result.data.data);
                    res.send(obj);
                } else {
                    res.send(result.data);
                }
            }).catch(error => {
                console.log("Error is: " + error.message);
                res.send(new APIResponseForConsent(205, SOMETHING_WENT_MSG))
            });

        }
    } catch (error) {
        res.send(new APIResponseForConsent(205, SOMETHING_WENT_MSG))
    }
})

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
            "message": simRes.status == 200 ? 'Consent has been sent to driver' : (simRes.status == 400 ? 'Consent is already given' : simRes.message),
            "driver": {
                "name": body.driverName,
                "mobile": body.driverMno,
                "ts": new Date()
            }
        });

    });
}

router.post('/v2/GetConsentForSIM', async (req, res) => {
    try {
        let body = req.body;
        if (body.mobileno.length == 0) {
            res.send(new APIResponse(201, mobileMsg));
        }
        else {
            let mobileNos = [];
            let invalidMobileNo: Boolean = false;
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

            if (!invalidMobileNo) {
                await getConsentSIM(mobileNos).then(async (statusres: any) => {
                    res.send(statusres);
                }).catch(error => {
                    console.log("Error in inner catch /v2/GetConsentForSIM: " + error.message);
                    res.send(new Response(205, SOMETHING_WENT_MSG));
                })
            }
            else {
                res.send(new APIResponse(202, INVALID_DRIVER_MNO));
            }
        }
    } catch (error) {
        console.log("Error in outer catch /v2/GetConsentForSIM: " + error.message);
        let _response: any = new Response(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})

async function generateJMTIRefreshToken(enterpriseid, enterpriseName, apikey, secretkey) {
    try {
        return new Promise(async (resolve, reject) => {
            let jsonString = {
                "data": {
                    "enterprise_id": enterpriseid,
                    "key":{
                        "name":enterpriseName
                    }
                }
            }
            let url = Token.jmtienterpriseurl
            console.log("Enterprise Name is: "+ enterpriseName + ", EnterpriseId: " + enterpriseid + " ,SecretKey is : " + secretkey + " ,Enterprise expired api key: " + apikey)
            console.log("Token request is: " + JSON.stringify(jsonString));
            console.log("Token URL is: " + url + "/enterprises/apikey/v1/refresh");
            
            const headers = {
                'Content-Type': 'application/json',
                'ApiKey': apikey,
                "accountsecret": secretkey
            }
            await axios.post(url + "/enterprises/apikey/v1/refresh", jsonString, {
                headers: headers,
            }).then(async (result: any) => {
                if (result.data) {
                    console.log("JMTI refresh Token result is " + JSON.stringify(result.data));
                    resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("Error in JMTI refresh token  " + result);
                    resolve({ status: 204, message: "" })
                }
            }).catch(error => {
                console.log("Error in JMTI refresh token catch " + error.message);
                resolve({ status: 204, message: "" })
            });
        })
    }
    catch (e) {
        console.log("Error in JMTI refresh token final catch " + e.message);
        return (new JIOToken(205, {}))
    }
}

async function refreshTokenForJMTI(enterpriseid,enterpriseName, apikey, secretkey,username, userid) {
    console.log("refreshTokenForJMTI details : Enterprise Name is: "+ enterpriseName + ", EnterpriseId: " + enterpriseid + " ,SecretKey is : " + secretkey + " ,Enterprise expired api key: " + apikey)
    console.log("Username is: " + username + " ,Userid is: " + userid);

    let resultData: any = {};
    try {
        let token;
        let expires_in;
        let secretName;
        await generateJMTIRefreshToken(enterpriseid,enterpriseName, apikey, secretkey).then(async (genTokenResp: any) => {
            if (genTokenResp && genTokenResp?.status == 200) {
                console.log(Date.now.toString() + "JMTI refresh TokenResponse data is: " + JSON.stringify(genTokenResp));
                let tokenDetails = genTokenResp.data;
                console.log("Refresh tokenDetails are: " + JSON.stringify(tokenDetails));
                let accessToken, accesstokenexpiresEpoch, accesstokendateValue, name,secretkey;
                if (tokenDetails && tokenDetails?.data?.key?.type.toUpperCase() == "APIKEY") {
                    //Access token expiry time 
                    accessToken = tokenDetails?.data?.key ? tokenDetails.data.key.value : "";
                    expires_in = tokenDetails?.data?.key?.expiry ? tokenDetails.data.key.expiry.value : "";

                    name =  tokenDetails?.data?.key ? tokenDetails.data.key.name : "";
                    secretkey = tokenDetails?.data?.key ? tokenDetails.data.key.account_secret : "";

                    if (tokenDetails.data.key.hasOwnProperty("events")) {
                        accesstokendateValue = tokenDetails?.data?.keys?.events ? tokenDetails.data.keys.events.updated_on : "";
                        accesstokendateValue = accesstokendateValue.split("T");
                        accesstokendateValue = new Date(accesstokendateValue[0] + " " + accesstokendateValue[1])
                    }
                    else {
                        accesstokendateValue = new Date();
                    }

                    if (tokenDetails.data.key.expiry.unit.toUpperCase() == "DAYS") {
                        accesstokenexpiresEpoch = accesstokendateValue.setDate(accesstokendateValue.getDate() + parseInt(expires_in)).valueOf()
                    }

                    tokenDetails =
                    {
                        access_token: accessToken,
                        access_token_expires_in: accesstokenexpiresEpoch,
                        enterpriseName : name,
                        account_Secret : secretkey
                    }
                    microservicesurl.isRedisCache ? await tokenPushToArrayForJMTIRedis(username, tokenDetails, username, userid) : await tokenPushToArrayForJMTINew(username, tokenDetails, username);
                    token = tokenDetails.access_token,
                    expires_in = Number(accesstokenexpiresEpoch),
                    enterpriseName = tokenDetails.enterprise_Name,
                    secretName = tokenDetails.account_Secret

                    resultData.token = token;
                    resultData.expiryIn = expires_in;
                    resultData.enterpriseName = enterpriseName;
                    resultData.account_Secret = secretName;
        
                    console.log("Token Responce is refreshTokenForJMTI()" + JSON.stringify(resultData));
                    return (new Response(200, SUCCESS_MSG, resultData))
                } else {
                    console.log("JMTI Refresh TokenResponse APIKEY Not Available: " + JSON.stringify(genTokenResp));
                    return (new Response(400, nodataMsg, genTokenResp))
                }
            } else {
                console.log("JMTI Refresh TokenResponse Data Not Available: " + JSON.stringify(genTokenResp));
                return (new Response(400, nodataMsg, genTokenResp))
            }
        
        }).catch(error => {
            console.log("Error in generateJMTIRefreshToken()" + error.message);
            return (new Response(500, SOMETHINGMSG, resultData))
        });
    }
    catch (e) {
        console.log("Error in Outer Catch Block generateJMTIRefreshToken()" + e.message);
        return (new Response(205, "", resultData))
    }
}

class JIOToken {
    status: Number;
    data: any;
    constructor(status, data = {}) {
        this.status = status
        this.data = data
    }
}
//USed to get candata keys
async function canData(regno) {
    try {
        return new Promise(async (resolve, reject) => {
            //call procedure get pdid,adminid ,usertype
            let body = { regno: regno }
            await axios.post(microservicesurl.jca_url + 'getVehiclePdid', body).then(async result => {                
                if (result && result?.status == 200 && result?.data?.data) {
                    let adminid: string = result?.data?.data?.UserName ? result?.data?.data?.UserName : "";
                    let vehpdid: string = result?.data?.data?.PD_ID ? result?.data?.data?.PD_ID : "";
                    let password: string = result?.data?.data?.ApiPassword ? result?.data?.data?.ApiPassword : "";
                    if (vehpdid) {
                        let token: any = await getJioToken(adminid, password, config_details.jioapi);
                        console.log("getSiteAdminData response", token)
                        if (token && token.status == 200) {
                            let accesstoken = token.data.access_token;
                            let vssResultset: any
                            /** Vehicle System Status API Calling Start  */
                            vssResultset = await getVSSData(accesstoken, config_details.jioapi, vehpdid)                            
                            try {
                                if (vssResultset && vssResultset?.status == 200) {
                                    let vssResultsetdata = vssResultset?.data?.data
                                    let VSSResponse: any = await VSSDataResponseFormat(vssResultsetdata)
                                    console.log("VSSDataResponseFormat Response : " + VSSResponse)
                                    if (VSSResponse && VSSResponse.status == 200) {
                                        console.log("Data Available in VSS API", JSON.stringify(VSSResponse.data));
                                        resolve(VSSResponse.data)
                                    } else {
                                        console.log("No Data Available in VSS API", vssResultset.message);
                                        resolve("")
                                    }

                                } else if (vssResultset && vssResultset?.status == 401) {
                                    token = await getJioToken(adminid, password, config_details.jioapi);
                                    if (token.status == 200) {
                                        accesstoken = token.data.access_token;
                                    }
                                    vssResultset = await getVSSData(accesstoken, config_details.jioapi, vehpdid)
                                    let vssResultsetdata = vssResultset?.data?.data
                                    let VSSResponse: any = await VSSDataResponseFormat(vssResultsetdata)
                                    console.log("VSSDataResponseFormat Response : " + VSSResponse)
                                    if (VSSResponse && VSSResponse.status == 200) {
                                        console.log("Data Available in VSS API", JSON.stringify(VSSResponse.data));
                                        resolve(VSSResponse.data);
                                    } else {
                                        console.log("No Data Available in VSS API", vssResultset.message);
                                        resolve("");
                                    }
                                }
                                else {
                                    console.log("ERROR token api");
                                    resolve("");
                                }

                            } catch (err) {
                                console.log("ERROR in getVSSData response: ", err.message);
                                resolve("");
                            }
                        }
                    } else {
                        resolve("");
                    }
                } else {
                    resolve("");
                }
            })
        })
    } catch (error) {
        console.log("Error in canData() catch block :", error.message)
        return "";
    }

}

/** Get JIO Token API calling START */
async function getJioToken(username, password, jioapi) {
    try {
        return new Promise(async (resolve, reject) => {
            let jsonString = "username=" + username + "&password=" + password + "&grant_type=password&client_secret=apiOne&client_id=apiOne";
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }

            await axios.post(jioapi + "/oauth/token", jsonString, {
                headers: headers,

            }).then(result => {
               // result.status = 200
                if (result && result?.status == 200 ) {
                    return resolve({ status: 200, message: "Success", data: result.data })
                }
                else {
                    console.log("oauth/token No data available in service.ts");
                    return resolve({ status: 204, message: "No data available", data: "" })
                }
            }).catch(error => {
                console.log("oauth/token No data available in service.ts");
                return resolve({ status: 204, message: "No data available", data: "" })
            });

        })

    }
    catch (e) {
        console.log("getJioToken catch block in service.ts");
        return ({ status: 500, message: "Something went wrong", data: "" })
    }
}
// Get vssdata jm api
async function getVSSData(accesstoken, jioapi, vehpdid) {

    return new Promise(async (resolve, reject) => {
        let headers = {
            'Content-Type': 'application/json',
            "Authorization": "Bearer " + accesstoken
        }
        // let url = jiourl+"vehiclesystemstatus/users/" + `${adminid}` + "?isDetailRequired=true&page="+pageNo+"&size=" + pageSize
        //    let url = jioapi+"vehiclesystemstatus/devices/" + `${"d516a79689314b64ad36ca25d1b7bb3a"}` 
        let url = jioapi + "/vehiclesystemstatus/devices/" + `${vehpdid}`
        await axios.get(url, { headers }).then((result: any) => {
            if (result && result?.data) {
                console.log("vehiclesystemstatus/devices/ data available",result);
                let resultdata = result.data;
                resolve({ status: 200, message: "Success", data: resultdata })
            }
            else {
                console.log("vehiclesystemstatus/devices/ No data available");
                resolve({ status: 204, message: "No data available", data: "" })
            }
        }).catch(error => {
            if (error?.response?.status == 502) {
                console.log("vehiclesystemstatus/devices/ api expection error in service: " + error.message);
                resolve({ status: 502, message: "Exception timeout/tokenexpired", data: "" })
            }
            else if (error?.response?.status == 401) {
                console.log("vehiclesystemstatus/devices/ api expection error in service: " + error.message);
                resolve({ status: 401, message: "Exception timeout/tokenexpired", data: "" })
            }
            else {
                console.log("vehiclesystemstatus/devices/ api expection error in service: " + error.message);
                resolve({ status: 205, message: "Exception timeout/tokenexpired", data: "" })
            }
        })
    });


}

//CANDATA Keys format
async function VSSDataResponseFormat(response) {
    return new Promise(async (resolve, reject) => {
        try {
            let vehicleStatusList: any = response.vehicleSystemStatus;
            let resultObj: any;
            resultObj = {
                OdoValue: "",
                EngineOilTemperature: "",
                BatteryVoltage: "",
                FuelLevel: ""
            };
            if (vehicleStatusList.hasOwnProperty("odometer")) {
                resultObj.OdoValue = vehicleStatusList?.odometer?.value ? vehicleStatusList.odometer.value : ""
            }
            if (vehicleStatusList.hasOwnProperty("engineOilTemperature")) {
                resultObj.EngineOilTemperature = vehicleStatusList?.engineOilTemperature?.value ? vehicleStatusList.engineOilTemperature.value : ""
            }
            if (vehicleStatusList.hasOwnProperty("fuelLevel")) {
                resultObj.FuelLevel = vehicleStatusList?.fuelLevel?.value ? Number(vehicleStatusList.fuelLevel.value).toFixed(2).slice(0, -1) : ""
            }
            if (vehicleStatusList.hasOwnProperty("vbat")) {
                resultObj.BatteryVoltage = vehicleStatusList?.vbat?.currentVoltage ? Number(vehicleStatusList.vbat.currentVoltage).toFixed(2).slice(0, -1) : ""
            }
            resolve({ 'status': 200, 'message': 'Success', 'data': resultObj });
        } catch (error) {
            console.log("Error in VSSDataResponseFormat Methos", error.message);
            resolve({ 'status': 500, 'message': SOMETHINGMSG, 'data': '' });
        }
    })
}


async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
export = router;


