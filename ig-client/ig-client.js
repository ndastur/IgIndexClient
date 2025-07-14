import axios from 'axios';

let isVerbose = false;
let useDemo = false;
let urlEndpoint = `https://${(useDemo?'demo-':'')}api.ig.com/gateway/deal`;
let LoginTokens = {};
let API_KEY = '';

function logVerbose(text) {
    if(isVerbose) console.log(text)
  }

export const useVerbose = (flag = false) => {
    isVerbose = flag;
}

export const base64ToPlainPassword = (base64password) => {
    return Buffer.from(base64password || '', 'base64').toString('ascii');
}

export const IGRestRequest = async (path, query = '', method = 'get') => {
  try {
    const headers = {
      "Content-Type": 'application/json; charset=UTF-8',
      "Accept": 'application/json; charset=UTF-8',
      "X-IG-API-KEY": API_KEY,
      "cst": LoginTokens.cst,
      "x-security-token": LoginTokens['x-security-token']
    };

    var res = await axios.request({
      method: method,
      url: urlEndpoint + `${path}/` + query,
      headers: headers,
      timeout: 8000
      });

    var json = await res.data;
    logVerbose('Get IG REST json resp:');
    logVerbose(json);
    return json;
  }
  catch(e) {
    console.error(e);
  }
}

export const logout = async () => {
  await IGRestRequest('/session', '', 'delete');
};

// Login to platform
export const LoginAsync = async (username, password, api_key, demo = false) => {
    try {
        useDemo = demo;
        urlEndpoint = `https://${(useDemo?'demo-':'')}api.ig.com/gateway/deal`;
        API_KEY = api_key;
        
        const loginData = {
          "identifier": username,
          "password": password,
          "encryptedPassword": null
        };
        logVerbose('Login Data:');
        logVerbose(loginData);
    
        var res = await axios.post(urlEndpoint + '/session', loginData, {
          headers: {
            "X-IG-API-KEY": api_key
          }
        });
    
        if(res.status == 403) {
            console.log('FAILED to login. Not authorised ...');
            process.exit(-1);
        }
    
        var json = await res.data;
        //console.log(json);
        console.info(`Logged into: ${json.currentAccountId}`);
    
        //console.log(res.headers);
        var tokens = {
          cst: res.headers.cst,
          "x-security-token": res.headers['x-security-token']
        };
    
        // Store
        LoginTokens = tokens;

        return tokens;
      }
      catch(e) {
        console.error(e);
      }
    
}

export const GetSessionEncryptionKey = async () => {
  try {
  var path = '/session/encryptionKey';
  var json = await IGRestRequest(path);
  }
  catch(e) {
    console.error(e);
  }
}

export const GetSentiment = async (symbol) => {
  try {
    var symbolQuery = (symbol.includes(',')) ? '?marketIds=' + encodeURIComponent(symbol) : symbol;
    var json = await IGRestRequest('/clientsentiment', symbolQuery);
    //console.log(json);
    return json;
  }
  catch(e) {
    console.error(e);
  }
}

// Get Market Detail from EPIC code
// e.g IX.D.FTSE.DAILY.IP
export const GetMarketDetailEpic = async (epic) => {
  try {
    var symbolQuery = (symbol.includes(',')) ? '?epics=' + encodeURIComponent(epic) : epic;
    var json = await IGRestRequest('/markets', symbolQuery);
    //console.log(json);
    return json;
  }
  catch(e) {
    console.error(e);
  }
}

export const GetMarketIdFromEpic = async (epic) => {
  try {
    var symbolQuery = (epic.includes(',')) ? '?epics=' + encodeURIComponent(epic) : epic;
    var json = await IGRestRequest('/markets', symbolQuery);
    if (epic.includes(',')) {
      var marketIds = json.marketDetails.map(function (element) {
        return {
          name: element.instrument.name,
          epic: element.instrument.epic,
          marketId: element.instrument.marketId
        }
      });
      console.log(marketIds);
      return marketIds;
    }
    else {
      var d = {
        name: element.instrument.name,
        epic: element.instrument.epic,
        marketId: element.instrument.marketId
      }
      console.log(d);
      return d;
    }
  }
  catch(e) {
    console.error(e);
  }
}

export const GetMarketIdsFromWatchlist = async (watchlistId) => {
  try {
    var watchlistJson = await IGRestRequest('/watchlists', watchlistId);
    var epics = watchlistJson.markets.map(function(e){
      return e.epic;
    });
    console.log(epics.join(','));

    var marketIds = await GetMarketIdFromEpic(epics.join(','));
    console.log(marketIds);
  }
  catch(e) {
    console.error(e);
  }
}
