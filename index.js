/**
     * Interfaces with the ClinicalTrials.gov API v2.
     */
    async function queryClinicalTrialsAPI(conditionParameters, locationParameters) {
        // Safe encoding: Removing "OR" from locations as API v2 can reject boolean logic in query.locn
        const safeLocation = locationParameters.split(' OR ')[0]; 
        const encodedCondition = encodeURIComponent(conditionParameters);
        const encodedLocation = encodeURIComponent(safeLocation);
        
        // Removed format=json as v2 defaults to JSON, keeping the URL as clean as possible
        const endpointUrl = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodedCondition}&query.locn=${encodedLocation}&filter.overallStatus=RECRUITING&pageSize=5`;

        try {
            const networkResponse = await fetch(endpointUrl);
            
            if (!networkResponse.ok) {
                // Extract the actual error payload from the API instead of guessing
                const errorPayload = await networkResponse.text();
                throw new Error(`HTTP ${networkResponse.status}: ${errorPayload}`);
            }
            
            const payload = await networkResponse.json();
            
            document.getElementById('primaryLoader').style.display = 'none';
            document.getElementById('mainDashboard').style.display = 'block';

            const resultsContainer = document.getElementById('apiResultsContainer');
            resultsContainer.innerHTML = ""; 

            if (!payload.studies || payload.studies.length === 0) {
                resultsContainer.innerHTML = "<p style='color: var(--danger-color); font-weight: bold;'>No active trials found matching the deduced parameters within the localized geographic network.</p>";
                return;
            }

            payload.studies.forEach((studyData) => {
                const protocol = studyData.protocolSection;
                const identification = protocol.identificationModule;
                const nctIdentifier = identification.nctId || "NCT_UNKNOWN";
                const studyTitle = identification.briefTitle || "Untitled Clinical Study";
                
                const statusInfo = protocol.statusModule;
                const currentStatus = statusInfo.overallStatus || "UNKNOWN STATUS";
                
                const eligibilityData = protocol.eligibilityModule;
                const rawCriteriaText = eligibilityData && eligibilityData.eligibilityCriteria 
                    ? eligibilityData.eligibilityCriteria.substring(0, 800) + "..." 
                    : "No structured criteria provided in registry.";

                const cardElement = document.createElement('div');
                cardElement.className = 'trial-card';
                cardElement.innerHTML = `
                    <div class="trial-header">${studyTitle}</div>
                    <div class="trial-metadata">
                        <span class="metadata-badge">${nctIdentifier}</span>
                        <span class="metadata-badge" style="background-color: #d4edda; color: #155724;">${currentStatus}</span>
                        <span><strong>Focus:</strong> ${conditionParameters.split(' OR ')[0]}</span>
                    </div>
                `;
                
                cardElement.onclick = () => simulateLLMParsingAndRender(nctIdentifier, rawCriteriaText);
                resultsContainer.appendChild(cardElement);
            });

        } catch (systemError) {
            console.error("Critical Failure in API fetching protocol:", systemError);
            document.getElementById('primaryLoader').style.display = 'none';
            
            // This will now display the exact technical reason for the failure
            alert(`API Connection Failed:\n\n${systemError.message}\n\nTroubleshooting:\n1. If this says 'Failed to fetch', your network firewall or an ad-blocker is intercepting the request.\n2. If it shows an HTTP error, the API rejected the search parameters.`);
        }
    }
