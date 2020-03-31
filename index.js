require('array.prototype.flatmap').shim();

const moment = require('moment');
const {Client} = require('@elastic/elasticsearch');
const covid = require('./novelcovid');
const CronJob = require("cron").CronJob;

const config = require('./config.json');

const currentIndexName = 'covid';
const elastic = new Client({
    node: config.elasticsearch.host,
    auth: {
        username: config.elasticsearch.username ? config.elasticsearch.username : null,
        password: config.elasticsearch.password ? config.elasticsearch.password : null
    }
});


function convertTimeline(original) {
    console.info('converting timeline for', original.country, original.province);
    let doc = {
        country: original.country,
        province: original.province,
        days: []
    };

    // Transform and add cases
    console.debug('converting cases for', original.country, original.province);
    if (original.timeline.cases !== {}) {
        for (let [date, cases] of Object.entries(original.timeline.cases)) {
            doc.days.push({
                date: moment.tz(date, 'MM/DD/YY', 'UTC').valueOf(),
                cases
            })
        }
    }

    // Add deaths to correlating doc
    console.debug('converting deaths for', original.country, original.province);
    if (original.timeline.deaths !== {}) {
        for (let [date, deaths] of Object.entries(original.timeline.deaths)) {
            let d = doc.days.find(x => x.date === moment.tz(date, 'MM/DD/YY', 'UTC').valueOf());
            d.deaths = deaths;
        }
    }

    // Return transformed docs
    return doc;
}

async function deleteAndRecreate() {
    // Delete index
    await elastic.indices.delete({
        index: currentIndexName,
        ignore_unavailable: true
    });

    // Create index
    await elastic.indices.create({
        index: currentIndexName,
        body: {
            mappings: {
                properties: {
                    date: {
                        type: 'date'
                    },
                    deathsPerOneMillion: {
                        type: 'long'
                    }
                }
            }
        }
    });
}

async function bulkAddDocs(arr) {
    // Bulk add countries
    const body = arr.flatMap(doc => [{index: {_index: currentIndexName}}, doc]);
    const {body: bulkResponse} = await elastic.bulk({refresh: true, body});

    if (bulkResponse.errors) {
        const erroredDocuments = [];
        bulkResponse.items.forEach((action, i) => {
            const operation = Object.keys(action)[0];
            if (action[operation].error) {
                erroredDocuments.push({
                    status: action[operation].status,
                    error: action[operation].error,
                    operation: body[i * 2],
                    document: body[i * 2 + 1]
                })
            }
        });
        console.warn(erroredDocuments)
    }

    const {body: count} = await elastic.count({index: currentIndexName});
    console.log(count);
}

async function run() {
    console.log('Reloading Mappings');
    const mappings = require('./countryMappings.json');

    console.log('Staring to fetch data');
    let countries = await covid.getCountry(config.api.host);
    let all_histories = [];
    (await covid.getHistorical(config.api.host)).forEach(x => {
        all_histories.push(convertTimeline(x))
    });


    let docs = [];
    // Transform current to elastic docs
    for (let cnt = 0; cnt < countries.length; cnt++) {
        let country = countries[cnt];

        console.info("Transforming data for", country.country);

        let mapping = mappings.find(x => x.live_country.toUpperCase() === country.country.toUpperCase());

        if (mapping !== null && mapping !== undefined) {
            //console.debug("Found mapping", mapping);

            let lastCases = 0;
            let lastDeaths = 0;

            // Over 100
            let firstOverIndex = 0;
            let lastOverIndex = -1;

            // Calculate history
            if (mapping.history_entries.length > 0) {
                console.info("Generating history for", country.country);

                // Attatch all histories
                let histories = [];
                mapping.history_entries.forEach(history_to_find => {
                    histories.push(all_histories.find(h => {
                        const h_country = h.country === null ? null : h.country.toUpperCase();
                        const h_province = h.province === null ? null : h.province.toUpperCase();

                        const f_country = history_to_find.country === null ? null : history_to_find.country.toUpperCase();
                        const f_province = history_to_find.province === null ? null : history_to_find.province.toUpperCase();

                         return h_country === f_country && h_province === f_province;
                    }));
                });

                // Aggregate all histories
                let history = histories[0];

                if (histories.length > 1) {
                    for (let i = 1; i < histories.length; i++) {
                        for (let day = 0; day < histories[i].days.length; day++) {
                            history.days[day].deaths += histories[i].days[day].deaths;
                            history.days[day].cases += histories[i].days[day].cases;
                        }
                    }
                }

                mapping.population = (country.cases * 1000000) / country.casesPerOneMillion;

                // TODO: Find Population counts used in live docs
                // Genereate history docs
                if(history !== undefined) {
                    history.days.forEach((day, i) => {
                        let doc = {
                            date: day.date,
                            country: {
                                name: mapping.live_country,
                                code: mapping.country_code,
                            },
                            cases: day.cases,
                            deaths: day.deaths,
                            todayCases: day.cases - lastCases,
                            todayDeaths: day.deaths - lastDeaths,
                            casesPerOneMillion: day.cases / (mapping.population / 1000000),
                            deathsPerOneMillion: day.deaths / (mapping.population / 1000000)
                        };

                        if (doc.cases >= 100) {
                            if (firstOverIndex === 0) {
                                firstOverIndex = i;
                            }

                            lastOverIndex = i - firstOverIndex;
                            doc.daysSinceOneHundred = lastOverIndex;
                        }

                        lastCases = day.cases;
                        lastDeaths = day.deaths;

                        docs.push(doc);
                    });
                } else {
                    console.warn('Misconfigured history mapping for', country);
                }
            }

            // Generate today based on history
            docs.push({
                date: moment().valueOf(),
                country: {
                    name: mapping.live_country,
                    code: mapping.country_code,
                },
                cases: country.cases,
                todayCases: country.todayCases,
                deaths: country.deaths,
                todayDeaths: country.todayDeaths,
                recovered: country.recovered,
                active: country.active,
                critical: country.critical,
                casesPerOneMillion: country.casesPerOneMillion,
                deathsPerOneMillion: country.deathsPerOneMillion,
                daysSinceOneHundred: country.cases >= 100 ? ++lastOverIndex : null
            });
        } else {
            console.warn('Missing mapping for', country);
        }
    }

    console.info('Bulk adding all docs');
    await deleteAndRecreate();
    await bulkAddDocs(docs);
}


if (config.interval > 0) {
    run().catch(console.log);

    // Run this cron job every x minutes
    new CronJob(`*/${config.interval} * * * *`, function () {
        run().catch(console.log);
    }, null, true);
} else {
    run().catch(console.log);
}

