const fetch = require('node-fetch');

module.exports = async function() {
    try { 
        return await fetch(`https://corona.lmao.ninja/all`).then(r=>r.json()); 
    } catch (e) { 
        throw new TypeError("Something went wrong, please try again later.");
    }
 }