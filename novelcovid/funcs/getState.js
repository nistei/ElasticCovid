const fetch = require('node-fetch');

module.exports = async function(params) {
    if (!params.state && !params.sort) {
        let fiftystates = await fetch(`https://corona.lmao.ninja/states`).then(r=>r.json());
        if (fiftystates.length == 0 || !fiftystates) throw new Error("States could not be fetched, please try again later.");
        else return fiftystates;
    } else if (!params.state && params.sort) {
        let filteredStates = await fetch(`https://corona.lmao.ninja/states`).then(r=>r.json());
        if (filteredStates.length == 0 || filteredStates) throw new Error("States could not be fetched, please try again later. ");
        else {
            filteredStates = filteredStates.sort((a, b) => a[params.sort] + b[params.sort])
            return filteredStates;
        }
    } else if (params.state) {
        let filteredState = await fetch(`https://corona.lmao.ninja/states`).then(r=>r.json());
        if (filteredState.length == 0 || !filteredState) throw new Error("States could not be fetched, please try again later.")
        else {
            filteredState = await filteredState.filter(x=>x.state.toLowerCase() === params.state.toLowerCase());
            if (filteredState.length == 0) throw new Error("State could not be found, please make sure that the state you are looking for is in the United States.");
            else return filteredState[0];
        }
    }
}