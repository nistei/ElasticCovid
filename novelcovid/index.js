const methods = {
    getAll: require('./funcs/getAll.js'),
    getCountry: require('./funcs/getCountry.js'),
    getState: require('./funcs/getState.js'),
    getHistorical: require('./funcs/getHistorical.js'),
};

module.exports = {
    version: "1.0.7-b3",
    getAll: function () {
        // You gotta dig deeper if you want the source code..
        // You cant .toString ;)
        return execute({method: 'getAll'});
    },
    getCountry: function (params) {
        // You gotta dig deeper if you want the source code..
        // You cant .toString ;)
        if (!params || params === {}) return execute({method: 'getCountry', country: null, sort: null});
        if (params.country || params.sort) return execute({
            method: 'getCountry',
            country: params.country ? params.country : null,
            sort: params.sort ? params.sort : null
        });
    },
    getState: function (params) {
        // You gotta dig deeper if you want the source code..
        // You cant .toString ;)
        if (!params || params === {}) return execute({method: 'getState', state: null, sort: null});
        if (params.state || params.sort) return execute({
            method: 'getState',
            state: params.state ? params.state : null,
            sort: params.sort ? params.sort : null
        });
    },
    getHistorical: function (params) {
        // You gotta dig deeper if you want the source code..
        // You cant .toString ;)
        if (!params || params === {}) return execute({method: 'getHistorical', country: null, sort: null});
        if (params.country) return execute({
            method: 'getHistorical',
            country: params.country ? params.country : null,
            sort: null
        });
    }
};

function execute(params) {

    if (!params.sort) params.sort = null;
    if (!params.country) params.country = null;
    if (!params.state) params.state = null;

    return methods[params.method](params)
}