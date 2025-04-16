// Scrapes course evaluation comments from the Princeton Registrar website.
// Requires a valid PHPSESSID cookie after logging in via CAS.
// Outputs scraped comments to raw_evaluations.json.

// Load external dependencies
const cheerio = require('cheerio')
const request = require('request')
const promptly = require('promptly')
const fs = require('fs') // Added for file system operations
require('colors')

// Load config variables from the .env file (optional, can be removed if not used)
require('dotenv').config()

// --- Removed Database Model Requires ---
// const courseModel = require('../models/course.js')
// require('../models/semester.js')
// const evaluationModel = require('../models/evaluation.js')
// --- Removed Database Model Requires ---

let sessionCookie
// --- Define courses to scrape directly ---
// Manually add courseID and term combinations here.
// term codes: 1244 = SP24, 1242 = FA23, 1234 = SP23, 1232 = FA22, 1252 = FA24, etc.
const coursesToScrape = [
    //{ courseID: '002011', term: '1244' }, // COS 333 SP24
    //{ courseID: '001999', term: '1242' }, // COS 126 FA23
    //{ courseID: '002062', term: '1244' }, // ECO 100 SP24
    { courseID: '002065', term: '1252' }  // COS 217 FA24 - Known to have comments
    // Add more course objects here
]
let allScrapedData = [] // Stores results before writing to file
// --- Define courses to scrape directly ---

// Fetches the HTML content of a specific course evaluation page.
const loadPage = function (term, courseID, callback) {
    const url = `https://registrarapps.princeton.edu/course-evaluation?terminfo=${term}&courseinfo=${courseID}`
    const options = {
        url: url,
        headers: {
            'Cookie': `PHPSESSID=${sessionCookie};`,
            // User-Agent helps identify the script politely
            'User-Agent': 'TigerType Scraper (github.com/ammaar-alam/tigertype)'
        },
        timeout: 15000 // Prevent requests from hanging indefinitely
    }

    request(options, (err, response, body) => {
        if (err) {
            console.error(`Error requesting ${url}: ${err.message}`.red)
            return callback(null, url) // Signal error to caller
        }
        if (response.statusCode !== 200) {
            console.error(`Non-200 status code (${response.statusCode}) for ${url}`.red)
            return callback(null, url) // Signal error to caller
        }
        callback(body, url)
    })
}

// Parses the HTML data for scores and comments.
const getCourseEvaluationData = function (term, courseID, externalCallback) {
    loadPage(term, courseID, function (data, url) {
        if (data === null) {
            return externalCallback(null, null, url) // Propagate loadPage error
        }

        const $ = cheerio.load(data)
        // Verify page title to ensure we didn't get redirected (e.g., to CAS)
        if ($('title').text() !== 'Course Evaluation Results') {
            if ($.html().includes('Central Authentication Service')) {
                console.error('Scraping failed: Redirected to CAS login. Your session cookie is likely invalid or expired.'.red)
            } else {
                console.error(`Scraping failed for ${url}. Unexpected page title: "${$('title').text()}".`.red)
            }
            return externalCallback(null, null, url) // Signal parse failure
        }

        console.log('\tReceived data for course %s in semester %s.'.green, courseID, term)

        // Extract quantitative scores (if available)
        let scores = {}
        try {
            const tableValue = $(".data-bar-chart").attr('data-bar-chart')
            if (tableValue) {
                JSON.parse(tableValue).forEach(function (arrayItem) {
                    if (typeof arrayItem['key'] === 'string' && typeof arrayItem['value'] !== 'undefined') {
                        scores[arrayItem['key']] = parseFloat(arrayItem['value'])
                    }
                })
            } else {
                // It's normal for some courses/terms to lack score data.
                // console.log(`\tNo score data found for ${courseID} in ${term}`.yellow)
            }
        } catch (parseError) {
            console.error(`\tError parsing score data for ${courseID} in ${term}: ${parseError.message}`.red)
            // Continue processing comments even if scores fail
        }

        // Extract qualitative comments
        const comments = []
        try {
            const commentValues = $(".comment")
            if (commentValues && commentValues.length > 0) {
                commentValues.each(function (index, element) {
                    // Clean up whitespace and newlines
                    const commentText = $(element).text().replace(/\n|\r/g, ' ').trim()
                    if (commentText) { // Avoid adding empty strings
                        comments.push(commentText)
                    }
                })
            } else {
                // It's normal for some courses/terms to lack comments.
                // console.log(`\tNo comments found for ${courseID} in ${term}`.yellow)
            }
        } catch (domError) {
            console.error(`\tError extracting comments for ${courseID} in ${term}: ${domError.message}`.red)
            // Attempt to return scores even if comments fail
        }

        externalCallback(scores, comments, url) // Return extracted data
    })
}

// Display instructions for getting the session cookie
const instructions = [
    '\t1. Log in to: ' + 'https://registrarapps.princeton.edu/course-evaluation'.yellow,
    '\t2. Open browser developer tools (Right-click -> Inspect).',
    '\t3. Go to the "Application" (Chrome) or "Storage" (Firefox) tab.',
    '\t4. Expand "Cookies" and select ' + 'https://registrarapps.princeton.edu'.yellow + '.',
    '\t5. Find the cookie named ' + 'PHPSESSID'.yellow + ' and copy its "Value".',
    '\tNote: The cookie expires; you may need to re-login and copy it again.'.grey
]

console.log('Princeton Course Evaluation Scraper'.cyan)
console.log('--------------------------------------'.cyan)
console.log('Instructions for getting the required session cookie:')
console.log(instructions.join('\n'))
console.log('--------------------------------------'.cyan)

// Main execution flow
promptly.prompt('Paste the PHPSESSID cookie value and hit enter:').then(cookie => {
    if (!cookie) {
        console.error('No session cookie provided. Exiting.'.red)
        process.exit(1)
    }
    sessionCookie = cookie

    // Use predefined course list
    const skipConfirmation = process.argv.length > 2 && process.argv[2] == '--skip'
    if (skipConfirmation) {
        return true
    }
    return promptly.confirm(`Scrape evaluation data for ${coursesToScrape.length} predefined courses? (y/n):`)
}).then(confirmation => {
    if (!confirmation) {
        console.log('Operation cancelled.')
        return process.exit(0)
    }

    let coursesPendingProcessing = coursesToScrape.length
    let courseIndex = 0
    // Delay between requests to avoid overwhelming the server
    const processingDelay = 250 // milliseconds

    console.log(`Starting scrape for ${coursesToScrape.length} courses...`.cyan)

    const interval = setInterval(function () {
        // Stop initiating new requests if all courses are dispatched
        if (courseIndex >= coursesToScrape.length) {
            clearInterval(interval)
            // Check completion after a delay, allowing last async requests to finish
            setTimeout(checkCompletion, processingDelay * 2)
            return
        }

        const thisCourse = coursesToScrape[courseIndex++]
        const term = thisCourse.term
        const courseID = thisCourse.courseID

        console.log(`Requesting: Term=${term}, CourseID=${courseID} (${courseIndex}/${coursesToScrape.length})`.yellow)

        getCourseEvaluationData(term, courseID, function (scores, comments, url) {
            // Decrement counter regardless of success/failure for this course
            const currentPending = --coursesPendingProcessing

            // Handle cases where fetching or parsing failed
            if (scores === null && comments === null) {
                console.error(`Failed to get data for course ${courseID}, term ${term}. Skipping.`.red)
            } else {
                // Add results to the main array only if comments exist
                if (comments && comments.length > 0) {
                    for (const comment of comments) {
                        allScrapedData.push({
                            course_id: courseID,
                            term: term,
                            comment_text: comment,
                            evaluation_url: url,
                            // Include scores associated with this evaluation page, even if comments failed partially
                            scores: (scores !== null) ? scores : {}
                        })
                    }
                } else {
                    // Log if scores were found but no comments (useful for debugging)
                    if (scores && Object.keys(scores).length > 0) {
                        console.log(`\tCourse ${courseID} term ${term} had scores but no comments.`.grey)
                    }
                }
            }

            // Log progress periodically
            if (currentPending % 10 === 0 && currentPending > 0) {
                console.log(`${currentPending} courses still processing…`)
            }

            // Final check if this was the last pending course
            if (currentPending === 0) {
                // Ensure interval is cleared before final write
                clearInterval(interval)
                writeResultsToFile()
            }
        })
    }, processingDelay)

    // Handles cases where the interval finishes before the last async callback.
    function checkCompletion() {
        if (coursesPendingProcessing === 0) {
            writeResultsToFile()
        } else {
            console.log(`Waiting for ${coursesPendingProcessing} requests to finish...`.grey)
            // Check again after a longer delay
            setTimeout(checkCompletion, processingDelay * 5)
        }
    }

    // Writes the collected data to a JSON file.
    let hasWritten = false // Prevent multiple writes
    function writeResultsToFile() {
        if (hasWritten) return
        hasWritten = true

        console.log(`Scraping finished. Writing ${allScrapedData.length} comments to raw_evaluations.json...`.cyan)
        try {
            // Use JSON.stringify with indentation for readability
            fs.writeFileSync('raw_evaluations.json', JSON.stringify(allScrapedData, null, 2))
            console.log('Successfully wrote results to raw_evaluations.json'.green)
            process.exit(0)
        } catch (writeError) {
            console.error('Error writing results to file:'.red, writeError)
            process.exit(1)
        }
    }

    // --- Remove Database Deletion Logic ---
    // evaluationModel.deleteMany({comment: {$regex: "^[0-9]$"}})
    // evaluationModel.deleteMany({comment: "."})
    // --- Remove Database Deletion Logic ---

}).catch(err => {
    console.error("An error occurred during script initialization:".red, err)
    process.exit(1)
}) 