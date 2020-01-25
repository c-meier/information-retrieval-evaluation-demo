import * as Utils from './utils.mjs';
import * as Doc from './docs.mjs';
import * as RetrievedDoc from './retrieveds.mjs';
import * as StandardRecallLevels from './standard_recall_levels.mjs';

/**
 * @typedef Doc
 * @type {object}
 * @property {boolean} relevant
 * @property {boolean} retrieved
 * @property {?string} id
 */

/**
 * @typedef RetrievedDoc
 * @type {Doc}
 * @property {number} rank
 * @property {number} precision
 * @property {number} recall
 */

/**
 * 
 * @param {RetrievedDoc[]} retrieveds 
 * @param {number} nbRelevant
 */
function calculateRankPrecisionAndRecall(retrieveds, nbRelevant) {
    let nbRetrievedRelevant = 0;
    for(let i = 0; i < retrieveds.length; i++) {
        let d = retrieveds[i];
        if (d.relevant) {
            nbRetrievedRelevant++;
        }
        d.precision = nbRetrievedRelevant / (d.rank + 1); 
        d.recall = nbRetrievedRelevant / nbRelevant;
    }
}

const RELEVANT_CHAR = "R";
const NONRELEVANT_CHAR = "N";
/**
 * 
 * @param {Doc} docs
 * @returns {string}
 */
function docs2retstr(docs) {
    return docs.filter(d => d.retrieved)
        .map(d => (d.relevant) ? RELEVANT_CHAR : NONRELEVANT_CHAR)
        .join("")
}

/**
 * 
 * @param {string} str
 * @returns {Doc}
 */
function retstr2docs(str) {
    return str.split("").map(c => ({
        relevant: (c === RELEVANT_CHAR),
        retrieved: true
    }))
}

/**
 * 
 * @param {string} ret 
 */
function validateRet(ret) {
    let foreign = ret.replace(new RegExp(RELEVANT_CHAR, 'g'), "")
                     .replace(new RegExp(NONRELEVANT_CHAR, 'g'), "");
    return (foreign.length === 0);
}

/**
 * 
 * @param {string} queryString 
 */
function validateParams(queryString) {
    let urlParams = new URLSearchParams(queryString);
    let ret = urlParams.get("ret");
    let nrels = urlParams.get("nrels");
    let preMsg = ""

    if (ret === null) {
        if (nrels === null || nrels < 0) {
            // All missing
            // Suggest default values
            nrels = 7;
            ret = "NNRNNRRRNN";
            preMsg = `<p>You must provide a sequence of retrieved documents (<code>ret</code>) and the number of relevant documents (<code>nrels</code>) in the collection.</p>`
        } else {
            // Only nrels
            if (nrels < 4) {
                ret = Array.from({ length: nrels }, () => "R").concat(Array.from({ length: 10 - nrels }, () => "N")).shuffle().join("")
            } else {
                ret = "NNRNNRRRNN";
            }
            preMsg = `<p>You must provide a sequence of retrieved documents (<code>ret</code>).</p>`
        }
        let link = `?ret=${ret}&nrels=${nrels}`
        return {
            err: true,
            msg:  preMsg +
                 `<p>For example <code><a href="${link}">${link}</a></code>. <code>${RELEVANT_CHAR}</code> indicating a relevant retrieved document and <code>${NONRELEVANT_CHAR}</code> indicating a non-relevant retrieved document.</p>` +
                 `<p><code>nrels</code> must be greater than or equals to the number of <code>${RELEVANT_CHAR}</code> in <code>ret</code></p>`
        }
    } else {
        // Everything is present
        ret = ret.toUpperCase();
        if (validateRet(ret)) {
            let retrieveds = retstr2docs(ret);
            let retrievedRelevants = retrieveds.filter(d => d.relevant);
            let nretrels = retrievedRelevants.length

            if (nrels === null) {
                // Only ret
                // Suggest nrels >= nretrels
                nrels = nretrels;
                let link = `?ret=${ret}&nrels=${nrels}`;
                return {
                    err: true,
                    msg: `<p>You must provide the number or relevant documents in the collection with the variable <code>nrels</code>.</p>` + 
                         `<p>If you keep <code>ret</code> the same, then <code>nrels</code> must be greater than or equal to ${nrels}</code>. For example <code><a href="${link}">${link}</a></code></p>`
                }
            } else {
                if (nretrels > nrels) {
                    let link = `?ret=${ret}&nrels=${nretrels}`
                    // To few relevants
                    return {
                        err: true,
                        msg: `<p>The number of relevant documents in the collection <code>nrels</code> must be greater than or equal to the number of retrieved relevant documents (<code>${nretrels}</code>)</p>` +
                        `<p>For example <code><a href="${link}">${link}</a></code>.</p>`
                    }
                }

                return {
                    err: false,
                    irq: new InformationRetrievalQuery(ret, nrels)
                };
            }
        } else {
            return {
                err: true,
                msg: `<p><code>ret</code> is not valid, it must contains only <code>${RELEVANT_CHAR}</code> and <code>${NONRELEVANT_CHAR}</code></p>`
            }
        }
    }
}

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const ID_LOG_BASE = Math.log(ID_CHARS.length)
/**
 * 
 * @param {number} max
 * @returns {string[]}
 */
function generateIds(max) {
    let nFull = Math.floor(max / ID_CHARS.length);
    let nRemain = max % ID_CHARS.length;

    let ids = Array.from({ length: nFull }, () => ID_CHARS).flat().concat(ID_CHARS.slice(0, nRemain));
    let offset = ID_CHARS.length;
    let nRepeat = offset;

    while(nFull !== 0) {
        let nTake = ids.length - offset - nFull * nRepeat;
        nRemain = nFull % ID_CHARS.length;
        nFull = Math.floor(nFull / ID_CHARS.length);

        // Should not need to generate everything when only parts are used.
        let repeat = ID_CHARS.map(c => Array(nRepeat).fill(c)).flat();
        let prefixes = Array.from({ length: nFull }, () => repeat).flat().concat(repeat.slice(0, nTake));
        
        for(let i = offset, j = 0; i < ids.length; i++, j++) {
            ids[i] = prefixes[j] + ids[i];
        }
        nRepeat *= ID_CHARS.length;
        offset += nRepeat;
    }

    return ids;
}

/**
 * 
 * @param {Doc} docs 
 * @param {string} prefix 
 */
function applyIds(docs, prefix) {
    let ids = generateIds(docs.length);
    docs.forEach(function(doc, i) {
        doc.id = prefix + ids[i];
    });
}

class InformationRetrievalQuery {
    constructor(ret, nbRelevant) {
        this.setState(ret, nbRelevant);

        history.replaceState({
            retrieveds: ret,
            nbRelevant: nbRelevant
        }, "", this.link);
    }

    updateNbRelevant(val) {
        this.setState(this.ret, val);
        this.changed();
    }

    updateNbRetrieved(val) {
        let retrieveds = this.retrieveds;
        if (val < this.nbRetrieved) {
            retrieveds = retrieveds.slice(0, val)
        } else {
            retrieveds = retrieveds.concat(Array(val - this.nbRetrieved).fill().map(() => ({ retrieved: true, relevant: false })))
        }

        this.setState(docs2retstr(retrieveds), this.nbRelevant);
        this.changed();
    }

    toggleRank(rank) {
        let d = this.retrieveds[rank];
        let diff = d.relevant ? -1: 1;
        let nbRetrievedRelevant = this.nbRetrievedRelevant + diff;
        let nbRelevant = this.nbRelevant;

        if (nbRetrievedRelevant > this.nbRelevant) {
            nbRelevant += diff;
        }
        d.relevant = !d.relevant;

        this.setState(this.ret, nbRelevant)

        this.changed()
    }

    setState(ret, nbRelevant) {
        let retrieveds = retstr2docs(ret);
        applyIds(retrieveds, "");

        // Assign rank to retrieved
        retrieveds.forEach((d, i) => d.rank = i);

        // Calculate precision and recall at rank
        calculateRankPrecisionAndRecall(retrieveds, nbRelevant);

        /**
         * @type {RetrievedDoc[]}
         */
        this.retrieveds = retrieveds;

        /**
         * @type {RetrievedDoc[]}
         */
        this.retrievedRelevants = this.retrieveds.filter(d => d.relevant);

        this.setNbRelevant(nbRelevant);
    }

    setNbRelevant(nbRelevant) {
        /**
         * @type {Doc[]}
         */
        this.notRetrievedRelevants = Array(nbRelevant - this.retrievedRelevants.length).fill()
            .map(_ => ({
                retrieved: false,
                relevant: true
            }))
        applyIds(this.notRetrievedRelevants, "-");

        /**
         * @type {Doc[]}
         */
        this.relevants = this.retrievedRelevants.concat(this.notRetrievedRelevants);
        
        /**
         * @type {Doc[]}
         */
        this.docs = this.retrieveds.concat(this.notRetrievedRelevants);
    }

    changed() {
        history.pushState({
            retrieveds: this.ret,
            nbRelevant: this.nbRelevant
        }, "", this.link);
        this.update();
    }

    update() {
        Doc.update(this);
        RetrievedDoc.update(this);
        StandardRecallLevels.update(this);
    }

    get ret() {
        return docs2retstr(this.retrieveds);
    }

    get nbRetrieved() {
        return this.retrieveds.length;
    }

    get nbRetrievedRelevant() {
        return this.retrievedRelevants.length;
    }

    get nbRelevant() {
        return this.relevants.length;
    }

    get nbDoc() {
        return this.docs.length;
    }

    get link() {
        return `?ret=${docs2retstr(this.retrieveds)}&nrels=${this.nbRelevant}`
    }

    get precision() {
        return this.nbRetrievedRelevant / this.nbRetrieved;
    }

    get recall() {
        return this.nbRetrievedRelevant / this.nbRelevant;
    }

    get averagePrecision() {
        return this.retrievedRelevants.reduce((acc,cur) => acc + cur.precision, 0) / this.nbRelevant
    }

    get rPrecision() {
        let rPrecision = NaN;
        if (this.nbRetrieved > 0 && this.nbRelevant > 0) {
            rPrecision = this.retrieveds[Math.min(this.nbRelevant, this.nbRetrieved) - 1].precision;
        }
        return rPrecision;
    }
}

document.addEventListener("DOMContentLoaded",function(){
    let validation = validateParams(window.location.search);
    if (validation.err) {
        // Show error message
        d3.select('#msg')
            .append("div")
            .attr("class", "alert alert-warning")
            .html(validation.msg);
    } else {
        let irq = validation.irq;
    
        window.onpopstate = function(event) {
            irq.setState(event.state.retrieveds, event.state.nbRelevant);
            irq.update();
        };

        Doc.create(irq);
        RetrievedDoc.create(irq);
        StandardRecallLevels.create(irq);
    }
});

