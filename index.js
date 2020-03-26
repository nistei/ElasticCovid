require('array.prototype.flatmap').shim();

const moment = require('moment');
const {Client} = require('@elastic/elasticsearch');
const covid = require('./novelcovid');
const mappings = require('./countryMappings.json');

const elastic = new Client({node: 'http://localhost:9200'});
const currentIndexName = 'covid';

function shouldGetHistory() {
    return process.argv.includes('history');
}

function generateCountryInfo(name) {
    let country = mappings.find(x => x.name.toUpperCase() === name.toUpperCase());

    if(country !== undefined) {
        return {
            iso2: country.country_code,
            iso3: '',
            _id: -1,
            lat: country.latlng[0],
            long: country.latlng[1],
            flag: `https://raw.githubusercontent.com/NovelCOVID/API/master/assets/flags/${country.country_code.toLowerCase()}.png`
        };
    }

    return undefined;
}

async function deleteAndRecreate() {
    // Delete index
    await elastic.indices.delete({
        index: currentIndexName
    });

    // Create index
    await elastic.indices.create({
        index: currentIndexName,
        body: {
            mappings: {
                properties: {
                    location: {
                        type: 'geo_point'
                    },
                    date: {
                        type: 'date'
                    }
                }
            }
        }
    });
}

async function bulkAddDocs(arr) {
    // Bulk add countries
    const body = arr.flatMap(doc => [{ index: { _index: currentIndexName } }, doc]);
    const { body: bulkResponse } = await elastic.bulk({ refresh: true, body });

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
        console.log(erroredDocuments)
    }

    const { body: count } = await elastic.count({ index: currentIndexName });
    console.log(count);
}

async function run() {
    let countries = await covid.getCountry();

    // Transform countries
    countries.forEach(entry => {
        entry.date = moment().valueOf();
        if(entry.countryInfo._id === 'NO DATA') {
            let info = generateCountryInfo(entry.country);

            if(info !== undefined) {
                entry.countryInfo = info;
            }
        }

        entry.countryInfo.location = `${entry.countryInfo.lat},${entry.countryInfo.long}`;

        delete entry.countryInfo.lat;
        delete entry.countryInfo.long;
    });

    if(shouldGetHistory()) {
        // Get history for every country

        await deleteAndRecreate();
        await countries.forEach(async country => {
            console.log(`Getting history for: ${country.country}`);

            let docs = [];
            // Get History
            let history = await covid.getHistorical({country: country.country});

            if(history.timeline.cases !== {}) {
                for (let [date, cases] of Object.entries(history.timeline.cases)) {
                    docs.push({
                        date: moment(date, 'MM/DD/YY').valueOf(),
                        cases,
                        country: country.country,
                        countryInfo: country.countryInfo
                    })
                }
            }

            if(history.timeline.deaths !== {}) {
                for (let [date, deaths] of Object.entries(history.timeline.deaths)) {
                    let d = docs.find(x => x.date === moment(date, 'MM/DD/YY').valueOf());
                    d.deaths = deaths;
                }
            }

            // Post process docs

            // Calculate days since 100 cases
            let firstOverIndex = 0;
            let lastOverIndex = 0;
            docs.forEach((doc, i) => {
               if(doc.cases >= 100) {
                   if(firstOverIndex === 0) {
                       firstOverIndex = i;
                   }

                   lastOverIndex = i - firstOverIndex;
                   doc.daysSinceOneHundred = lastOverIndex;
               }
            });

            // Add it to the current day as well
            if(firstOverIndex === 0 && country.cases >= 100) {
                country.daysSinceOneHundred = 0;
            } else {
                country.daysSinceOneHundred = lastOverIndex + 1;
            }
            // Add current day to the docs
            docs.push(country);

            // Calculate todays deaths
            for (let i = docs.length - 1; i >= 1; i--) {
                docs[i].todayDeaths = docs[i].deaths - docs[i - 1].deaths;
                docs[i].todayCases = docs[i].cases - docs[i - 1].cases;
            }


            if(docs.length <= 1) {
                console.warn('No historical entries for ', country);
            }

            await bulkAddDocs(docs);
        });
    }
    else {
        await deleteAndRecreate();
        await bulkAddDocs(countries);
    }

    await elastic.indices.refresh({index: currentIndexName});
}

run().catch(console.log);
