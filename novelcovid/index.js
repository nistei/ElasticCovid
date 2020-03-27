const methods = {
    getCountry: require('./funcs/getCountry.js'),
    getHistorical: require('./funcs/getHistorical.js'),
};

module.exports = {
    version: "1.0.7-b3",
    getCountry: function (params, baseUrl) {
        if (!params || params === {}) return execute({method: 'getCountry', country: null, sort: null}, baseUrl);
        if (params.country || params.sort) return execute({
            method: 'getCountry',
            country: params.country ? params.country : null,
            sort: params.sort ? params.sort : null
        }, baseUrl);
    },
    getHistorical: function (params, baseUrl) {
        if (!params || params === {}) return execute({method: 'getHistorical', country: null, sort: null}, baseUrl);
        if (params.country) return execute({
            method: 'getHistorical',
            country: params.country ? params.country : null,
            sort: null
        }, baseUrl);
    }
};

function execute(params, baseUrl) {

    if (!params.sort) params.sort = null;
    if (!params.country) params.country = null;
    if (!baseUrl) baseUrl = 'http://localhost:3000';

    return methods[params.method](params, baseUrl)
}
