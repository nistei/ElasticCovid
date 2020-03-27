const fetch = require('node-fetch');

module.exports = async function(params) {
    if (!params.country && !params.sort) {
        let countries = await fetch(`http://localhost:3000/countries`).then(r=>r.json());
        if (countries.length == 0 || !countries) throw new Error("States could not be fetched, please try again later.")
        else return countries
    } else if (!params.country && params.sort) {
        let countries = await fetch(`http://localhost:3000/countries?sort=${params.sort}`).then(r=>r.json());
        if (countries.length == 0 || !countries) throw new Error("States could not be fetched, please try again later.")
        return countries;
    } else if (params.country) {
        try { return await fetch(`http://localhost:3000/countries/${params.country}`).then(r=>r.json()); } catch (e) { throw new Error("Country could not be found.") };
    }
}
