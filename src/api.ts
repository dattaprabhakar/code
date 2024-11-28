import express from 'express';
import bodyParser from "body-parser";
const app: express.Application = express();
import apiRouter from './controllers/api'
import cors from 'cors'
import { JWT_SECRET } from './utils/JWTToken'
import { verify } from 'jsonwebtoken';
import { tokenResponse } from './utils/status'
import { microservicesurl } from './utils/config';
import { isUserLogin, isUserLogin_v1 ,getSubscriptionDetails} from './utils/common';
import { request } from 'http';
app.use(cors())
app.use(bodyParser.json());

const base_key = microservicesurl.base_key + "/api";
app.use(async (req, res, next) => {
    let apiKey;
    let urlArray = req.originalUrl.split('/');
    if (urlArray && urlArray.length > 0) {
        let method = urlArray[urlArray.length - 1]
        let contoller = urlArray[urlArray.length - 3]
        let tokenuserid = req.headers.tokenuserid ? req.headers.tokenuserid : req.body.loginid;
        if (method.toUpperCase() == "GETTOKEN") {
            let subscriptionDetails: any = await getSubscriptionDetails(req?.body?.userid);
            if (subscriptionDetails && subscriptionDetails?.subscription == 1 && contoller?.toUpperCase()=="AUTOMARKET") {
                res.send(new tokenResponse(201, "Access Denied"));
                return false;
            } else {
                next()
            }
        }
        else if (req.headers && req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                apiKey = parts[1];
            }
            if (apiKey) {
                // if (urlArray[3] != "trips") {
                //console.log("UserID is : " + tokenuserid + ", APIKey is : " + apiKey + "Controller Name is : " + urlArray[3])
                let subscriptionDetails: any = await getSubscriptionDetails(tokenuserid);

                if (subscriptionDetails && subscriptionDetails?.subscription == 1) {
                    res.send(new tokenResponse(201, "Access Denied"));
                    return false;
                }
                let isUserLoginStatus: any
                if (urlArray[3] == "jioAutoConnected") {
                    if (urlArray[4].toUpperCase() == "V1" || urlArray[5].toUpperCase() == "V1") {
                        console.log("Jio Autoconnected v1 calling..")
                        isUserLoginStatus = await isUserLogin(tokenuserid, apiKey, urlArray[3]);
                    }
                    else {
                        console.log("Jio Autoconnected v2 calling..")
                        isUserLoginStatus = microservicesurl.isRedisCache ? await isUserLogin_v1(tokenuserid, apiKey) : await isUserLogin(tokenuserid, apiKey, urlArray[3]);
                    }
                }
                else {
                    isUserLoginStatus = await isUserLogin(tokenuserid, apiKey, urlArray[3]);
                }
                console.log("Login status is:" + JSON.stringify(isUserLoginStatus))

                // microservicesurl.isRedisCache ? await isExitUserLoginForJHS_JMTI(loginResonse.userid) : await isExitUserLoginForJHS(loginResonse.userid);

                if (isUserLoginStatus.isLogin) {
                    req.headers["adminemailid"] = isUserLoginStatus.adminemailid;
                    let userTokens = isUserLoginStatus.tokens.filter((e) => { return e.tokenkey == apiKey })
                    if (userTokens && userTokens.length > 0) {
                        let token = userTokens ? userTokens[0].token : "";
                        console.log("Token is: " + token)
                        verify(token, JWT_SECRET, async (error, decoded) => {
                            if (error) {
                                res.send(new tokenResponse(401, error.message, '', ''));
                            }
                            else if (!tokenuserid) {
                                res.send(new tokenResponse(401, "Token userid is required", '', ''));
                            }
                            else {
                                next();
                            }
                        });
                    }
                    else {
                        res.send(new tokenResponse(402, "This access token is not valid", '', ''));
                        return
                    }
                } else {
                    res.send(new tokenResponse(402, "This access token is not valid", '', ''));
                    return
                }
                // }
                // else {
                //     verify(apiKey, JWT_SECRET, async (error, decoded) => {
                //         if (error) {
                //             res.send({ sts: 401, msg: error.message })
                //         }
                //         else {
                //             next();
                //         }
                //     });
                // }
            }
            else {
                res.send(new tokenResponse(401, "Unauthorized", '', ''));
                return
            }
        }
        else {
            res.send(new tokenResponse(401, "Unauthorized", '', ''));
            return
        }
    }
    else {
        console.log("urlArray is empty");
    }
});

app.use(base_key, apiRouter);


export = app;