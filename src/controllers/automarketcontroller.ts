import Router from 'express';
import { SOMETHING_WENT_MSG, USER_ID, TOKEN_ID,MANDATORY_ERROR_MSG, USER_NAME, PASSWORD_VAILD_MSG, SUCCESS_MSG } from './../utils/errormsg';
import { APIResponse,LoginResponse,tokenResponse, tokenResponseAutoMarket } from './../utils/status';
import { microservicesurl, Token } from './../utils/config';
import axios from 'axios';
import { generateToken } from './../utils/JWTToken';
import { getEncryptPassword } from './../utils/common';
import { isExitUserLogin, removeToken, tokenPushToArray } from './common';

const router = Router();
const jsonheader = {
    'Content-Type': 'application/json'
}

router.post("/v1/gettoken", async (req, res) => {
    let resultData:any={};
    try {
        let body = req.body;
        body.username = body.username ? body.username:"";
        //body.otp = "123456";
        let token;
        let expires_in;
        // if (!body.username) {
        //     res.send(new tokenResponseAutoMarket(201, USER_NAME))
        //     return
        // }
         if (!body.userid) {
            res.send(new tokenResponseAutoMarket(201, USER_ID))
            return
        }
        else {
           // let encryptedpwd = await getEncryptPassword(body.password)
          //  let jsonbody = { username: body.username, password: encryptedpwd}
            // await axios.post(microservicesurl.configurationpath + 'v1/authorization', jsonbody, { headers: jsonheader }).then(async result => {
            //     let _result = result.data;
            let result: any={}
            
                // if (_result.status == 200) {
                //     if (result.data.user_existance.toLowerCase() == "existed") {
                //         let hdata: any = await GetToken(_result.adata.enterpriseid, _result.adata.password);

                       // if (hdata.status == 200 || _result.adata.userType === 7) {

                            let atoken: any = {};
                            let isExitUserToken: any = await isExitUserLogin(body.userid);
                            if (isExitUserToken.status == 200) {


                                let expiresEpoch = Number(isExitUserToken.data.tokens[0].expiresin);
                                let currentEpoch = Date.now();

                                if ((expiresEpoch > currentEpoch) && isExitUserToken.data.tokens[0].tokenkey != "") {
                                    //atoken = {
                                        token = isExitUserToken.data.tokens[0].tokenkey,
                                      //  refreshToken: isExitUserToken.data.tokens[0].refreshtokenkey,
                                        expires_in = Number(isExitUserToken.data.tokens[0].expiresin)
                                    //}
                                } else {
                                    await removeToken(body.userid, isExitUserToken.data.tokens[0].token);
                                    let genTokenResp = await generateToken(body.userid);
                                    await tokenPushToArray(body.userid, genTokenResp, body.username);
                                   // atoken = {
                                        token = genTokenResp.tokenkey,
                                       // refreshToken: genTokenResp.refreshtokenkey,
                                        expires_in = Number(genTokenResp.expires_in)
                                   // }
                                }

                            } else {
                                let genTokenResp = await generateToken(body.userid);
                                await tokenPushToArray(body.userid, genTokenResp, body.username);
                                //atoken = {
                                    token = genTokenResp.tokenkey,
                                   // refreshToken: genTokenResp.refreshtokenkey,
                                    expires_in = Number(genTokenResp.expires_in)
                              //  }
                            }

                            //delete result.data.adata['password']
                            //result.data.adata["accesstoken"] = atoken;

                            // result.data.token = token;
                            // result.data.expiryIn = expires_in;

                          //  resultData.status = "200";
                            //resultData.message = "Success";
                            resultData.token = token;
                            resultData.expiryIn = expires_in;
                            resultData.tokenuserid = body.userid;

                           // printSIEM_LOGS(new SIEMLogDetl(ip, SIEM_LOGIN, SIEM_LOGIN_SUCCESS, body.username))

                            res.send(new LoginResponse(200, SUCCESS_MSG, resultData))
                            return
                        // }
                        // else {
                        //     res.send(new LoginResponse(400, result.data.message, Token.NotFound))
                        // }
                    // }
                    // else {
                    //     let hdata: any = await GetToken(body.username, body.password)
                    //     if (hdata.status == 200) {
                    //         res.send(new LoginResponse(200, SUCCESS_MSG, Token.New))
                    //         return
                    //     } else {
                    //         res.send(new LoginResponse(400, result.data.message, Token.NotFound))
                    //         return
                    //     }
                    // }
                // }
                // else {
                //     res.send(new LoginResponse(400, result.data.message, resultData))
                //    // res.send(result.data)
                // }

            // }).catch(error => {
            //     res.send(new LoginResponse(205, SOMETHING_WENT_MSG, Token.NotFound))
            // });
            // await axios.post(microservicesurl.configurationpath + 'v2/user-validate', jsonbody).then(async result => {
            //     if (result.data) {
            //         let loginResonse: any = result.data;
            //         let loginToken: any = ''
            //         if (loginResonse.status == 200) {
            //             loginToken = await generateToken(loginResonse.clientid);
            //         }
            //         res.send(new tokenResponseAutoMarket(loginResonse.status, loginResonse.message, loginToken.token ? loginToken.token : '', loginResonse.userid));
            //     }
            // }).catch(error => {
            //     res.send(new tokenResponseAutoMarket(205, SOMETHING_WENT_MSG, '', ''));
            // });
        }

    } catch (error) {
        res.send(new tokenResponseAutoMarket(205, SOMETHING_WENT_MSG, '', ''));
    }
});

router.post('/v1/getAMUserDetail', async (req, res) => {
    try {
        let body = req.body;
        let apiKey;
        //const parts = req.headers.authorization.split(' ');
        const userid = req.headers.tokenuserid;
        // if (parts.length <= 1 || parts[1] === "") {
        //     res.send(new APIResponse(400, TOKEN_ID));
        //     return
        // }
        // if (parts.length === 2 && parts[0] === 'Bearer') {
        //     apiKey = parts[1];
        // }
        if(userid) {
            let jsonbody = { userId: userid, token: apiKey }
            await axios.post(microservicesurl.configurationpath + 'v1/getAMUserDetail', jsonbody).then(async result => {
                res.send(result.data)
            }).catch(error => {
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            })
        }
        else{
            res.send(new APIResponse(400, TOKEN_ID));
        }
    } catch (error) {
        let _response: any = new APIResponse(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})

router.post('/v1/GetAMVehicles', async (req, res) => {
    try {
        let body = req.body;

        let apiKey;
       // const parts = req.headers.authorization.split(' ');
        const userid = req.headers.tokenuserid;
        // if (parts.length <= 1 || parts[1] === "") {
        //     res.send(new APIResponse(400, TOKEN_ID));
        //     return
        // }
        // if (parts.length === 2 && parts[0] === 'Bearer') {
        //     apiKey = parts[1];
        // }
        if(userid) {
            let jsonbody = { userId: userid, token: apiKey, pageSize: body.size, pageNo: body.pageNo }
            await axios.post(microservicesurl.configurationpath + 'v1/getAMVehicleDetails', jsonbody).then(async result => {
                res.send(result.data)
            }).catch(error => {
                res.send(new APIResponse(205, SOMETHING_WENT_MSG))
            })
        }
        else{
            res.send(new APIResponse(400, TOKEN_ID));
        }
    } catch (error) {
        let _response: any = new APIResponse(205, SOMETHING_WENT_MSG);
        res.send(_response);
        return
    }
})

async function GetToken(username, password) {
    try {
        return new Promise(async (resolve, reject) => {
            let jsonString = "username=" + username + "&password=" + password + "&grant_type=password&client_secret=apiOne&client_id=apiOne";
            let url = Token.jioapi
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }

            await axios.post(url + "/oauth/token", jsonString, {
                headers: headers,
                timeout: 50000
            }).then(result => {
                if (result.data) {
                    return resolve(new JIOToken(200, result.data))
                }
                else {
                    return resolve(new JIOToken(204, ""))
                }
            }).catch(error => {
                return resolve(new JIOToken(204, ""))
            });

        })

    }
    catch (e) {
        return (new JIOToken(205, {}))
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

export = router;