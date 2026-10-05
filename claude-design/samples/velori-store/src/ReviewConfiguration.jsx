import React from 'react';
import {ConfigurationSummary,PrimaryButton} from './library.jsx';

// Review column adapted from the accepted Claude Design handoff captured 2026-10-05.
// The application owns configuration, navigation, persistence, imagery and focus restoration.
export function ReviewConfiguration({configuration,onBack}) {
 return <section className="options review-options" aria-labelledby="page-heading">
  <p className="eyebrow">YOUR VELORI</p>
  <h1 id="page-heading" tabIndex="-1">Review configuration.</h1>
  <p className="sub">Check your choices.</p>
  <ConfigurationSummary configuration={configuration}/>
  <PrimaryButton id="edit-configuration" onClick={onBack}>Edit configuration</PrimaryButton>
  <button type="button" id="review-back" className="back-link review-back" onClick={onBack} aria-label="Back to configurator">← Back</button>
 </section>;
}
