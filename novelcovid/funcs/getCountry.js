const fetch = require('node-fetch');

module.exports = async function(params, baseUrl) {
    if (!params.country && !params.sort) {
        let countries = await fetch(`${baseUrl}/countries`).then(r=>r.json());
        if (countries.length == 0 || !countries) throw new Error("States could not be fetched, please try again later.")
        else return countries
    } else if (!params.country && params.sort) {
        let countries = await fetch(`${baseUrl}/countries?sort=${params.sort}`).then(r=>r.json());
        if (countries.length == 0 || !countries) throw new Error("States could not be fetched, please try again later.")
        return countries;
    } else if (params.country) {
        try { return await fetch(`${baseUrl}/countries/${params.country}`).then(r=>r.json()); } catch (e) { throw new Error("Country could not be found.") };
    }
}
