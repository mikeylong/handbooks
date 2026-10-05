import React from 'react';
import {ConfigurationSummary,PrimaryButton} from './library.jsx';

// Adapted from the verified Claude Design Code handoff; see provenance/native-handoff.json.
// The application owns configuration, navigation and focus restoration.
export function ReviewConfiguration({configuration,onBack}) {
 return <section className="options review-options" aria-labelledby="page-heading">
  <p className="eyebrow">STEP 2 OF 2</p>
  <h1 id="page-heading" tabIndex="-1">Review configuration.</h1>
  <p className="sub">Check your choices. You can still change any of them.</p>
  <ConfigurationSummary configuration={configuration}/>
  <PrimaryButton onClick={onBack}>Edit configuration</PrimaryButton>
  <button type="button" className="back-link review-back" onClick={onBack} aria-label="Back to configurator">← Back</button>
 </section>;
}
