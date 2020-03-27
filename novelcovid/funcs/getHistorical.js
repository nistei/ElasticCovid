const fetch = require('node-fetch');

module.exports = async function(params) {
    if (!params.country) {
        let countries = await fetch(`http://localhost:3000/v2/historical`).then(r=>r.json());
        if (countries.length === 0 || !countries) throw new Error("History could not be fetched, please try again later.");
        else return countries
    } else if (params.country) {
        try { return await fetch(`http://localhost:3000/v2/historical/${params.country}`).then(r=>r.json()); } catch (e) { throw new Error("Country history could not be found.") }
    }
}
