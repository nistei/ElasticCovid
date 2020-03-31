const fetch = require('node-fetch');

module.exports = {
    version: "1.0.7-b3",
    getCountry: async function (baseUrl) {
        console.log('Fetching countries from', baseUrl);
        let countries = await fetch(`${baseUrl}/countries`).then(r=>r.json());
        if (countries.length === 0 || !countries) throw new Error("States could not be fetched, please try again later.");
        else return countries
    },
    getHistorical: async function (baseUrl) {
        console.log('Fetching history from', baseUrl);
        let countries = await fetch(`${baseUrl}/v2/historical`).then(r=>r.json());
        if (countries.length === 0 || !countries) throw new Error("History could not be fetched, please try again later.");
        else return countries
    }
};

