import express from 'express';
const app = express();
import tripsRouter from './tripscontroller';
import configurationRouter from  './configuration';
import autoMarketRouter from  './automarketcontroller';
import jioConnectedRouter from './jioautoconnectedcontroller';

app.use('/trips',tripsRouter)
app.use('/configuration',configurationRouter)
app.use('/autoMarket',autoMarketRouter)
app.use('/jioAutoConnected',jioConnectedRouter)

export = app