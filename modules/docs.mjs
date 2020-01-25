/**
 * Display statistics about the query.
 * @param {InformationRetrievalQuery} irq 
 */
function displayStatistics(irq) {
    composants.number_doc
        .text( `${irq.nbDoc}+` );
    composants.number_retrieved
        .property("value", irq.nbRetrieved);
    composants.number_retrieved_relevant
        .text( irq.nbRetrievedRelevant );
    composants.number_relevant
        .property("min", irq.nbRetrievedRelevant )
        .property("value", irq.nbRelevant);
}

/**
 * Value to display in a document.
 * @param {Doc} doc 
 */
function displayId(doc) {
    return doc.retrieved ? doc.id : "?";
}

/**
 * Display all the documents.
 * @param {InformationRetrievalQuery} irq
 */
function displayDocs(irq) {
    composants.docs
      .selectAll('div.doc')
      .data(irq.docs, d => d.id)
      .join(
        enter => enter.append("div")
            .attr('class', 'doc')
            .text(displayId)
          .on('click', function(d) {
            if (d.retrieved) {
              irq.toggleRank(d.rank);
            }
          })
      )
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);
}

/**
 * Display all relevant documents.
 * @param {InformationRetrievalQuery} irq 
 */
function displayRelevants(irq) {
    composants.relevant_docs
      .selectAll('div.doc')
      .data(irq.relevants, d => d.id)
      .join(
        enter => enter.append("div")
            .attr('class', 'doc')
            .attr('docId', d => d.id)
            .text(displayId)
      )
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);
}

let composants = {};

function create(irq) {
  composants.docs = d3.select('#all_docs');

  composants.relevant_docs = d3.select('#relevant_docs');

  composants.number_doc = d3.select('#number_docs.value');

  composants.number_retrieved = d3.select('#number_retrieved')
    .on("change", function() {
      let nbRetrieved = d3.select(this).property("value");
      irq.updateNbRetrieved(nbRetrieved);
    });
    
  composants.number_relevant = d3.select('#number_relevant')
    .on("change", function() {
      let nbRelevant = d3.select(this).property("value");
      irq.updateNbRelevant(nbRelevant);
    });

  composants.number_retrieved_relevant = d3.select('#number_retrieved_relevant.value');

  update(irq);
}

function update(irq) {
  composants.number_relevant
      .attr("value", irq.nbRelevant)
      .attr("min", irq.nbRetrievedRelevant );
    
  displayStatistics(irq);
  displayDocs(irq);
  displayRelevants(irq);
}

export {create, update}