import assert from 'node:assert/strict';

const semver=/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const isSha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const older=(a,b)=>{const x=a.split('.').map(BigInt),y=b.split('.').map(BigInt);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]<y[i];return false;};

export function retainedExercisePaths(edition) {
  return {
    releaseManifest:`claude-design/baselines/v${edition}/release-manifest.json`,
    publicationPackage:`claude-design/baselines/v${edition}/publication-package.json`,
    publicationApproval:`claude-design/qa/v${edition}/publication-approval.json`,
    exerciseDownloads:`claude-design/baselines/v${edition}/exercise-downloads.json`
  };
}

export function explorationExerciseEdition(manifest) {
  const c=manifest.releaseContract;
  if(!Object.hasOwn(c,'retainedExercise'))return manifest.version;
  const r=c.retainedExercise;
  assert.ok(r&&typeof r==='object','Retained exercise approval pins required');
  assert.ok(typeof r.edition==='string'&&semver.test(r.edition)&&semver.test(manifest.version)&&older(r.edition,manifest.version),'Retained exercise must precede the handbook edition');
  for(const [key,path] of Object.entries(retainedExercisePaths(r.edition))) {
    assert.equal(r[key]?.path,path,'Retained exercise must bind its original '+key);
    assert.ok(isSha(r[key].sha256),'Retained exercise hash required: '+key);
  }
  return r.edition;
}

/** Reuse approved artifacts only when their original authority and all bytes agree. */
export function validateRetainedExplorationExercise(manifest,{records,companion,companionSha256,archiveSha256,archiveBytes,downloads}) {
  const c=manifest.releaseContract,r=c.retainedExercise,edition=explorationExerciseEdition(manifest);
  assert.ok(r,'Explicit retained exercise contract required');
  for(const key of Object.keys(retainedExercisePaths(edition)))assert.equal(records[key]?.sha256,r[key].sha256,'Stale retained exercise '+key);
  const original=records.releaseManifest.data,approval=records.publicationApproval.data,pkg=records.publicationPackage.data,originalDownloads=records.exerciseDownloads.data;
  assert.equal(original.version,edition,'Retained exercise manifest edition mismatch');
  assert.equal(original.approvalStatus,'approved','Retained exercise must come from an approved edition');
  assert.equal(original.releaseContract.retainedExercise,undefined,'Bind the original artifact edition, not a chain of reuse');
  for(const key of ['kind','sample','nativeStarter','nativeEvidence','prototypeEvidence','companionParityEvidence','archiveMemberCount','chapterCount'])assert.deepEqual(c[key],original.releaseContract[key],'Changed retained exercise contract: '+key);
  assert.deepEqual(original.publicationApproval,r.publicationApproval,'Retained exercise original approval differs');
  assert.equal(approval.status,'approved','Retained exercise approval required');
  assert.ok(approval.command==='Land this'||(approval.command==='address this and make a new release'&&approval.authority?.kind==='explicit-user-release'),'Retained exercise publication authority required');
  assert.deepEqual(approval.publicationPackage,{path:'claude-design/publication-package.json',sha256:r.publicationPackage.sha256},'Retained exercise approved package differs');
  assert.equal(pkg.id,'claude-design');assert.equal(pkg.version,edition,'Retained exercise package edition mismatch');
  assert.deepEqual(approval.exercise,{path:c.sample.repositoryPath,sha256:archiveSha256},'Retained exercise bytes differ from original approval');
  assert.ok(approval.pdfs.some(pdf=>pdf.path==='claude-design/'+original.pdf&&pdf.sha256===original.sha256),'Retained exercise approval must bind its original handbook');
  assert.equal(originalDownloads.book,'claude-design');assert.equal(originalDownloads.version,edition);
  assert.equal(originalDownloads.exerciseEdition,undefined,'Original artifact download definition must own its edition');
  assert.equal(pkg.files['exercise-downloads.json'],r.exerciseDownloads.sha256,'Retained exercise download definition differs from approved package');
  assert.equal(downloads.book,'claude-design');assert.equal(downloads.version,manifest.version);
  assert.equal(downloads.exerciseEdition,edition,'Explicit retained download edition required');
  assert.deepEqual(downloads.downloads,originalDownloads.downloads,'Retained exercise download rows changed');
  const prefix=`reader/editions/v${edition}/`,archivePath=c.sample.repositoryPath.slice('claude-design/'.length);
  const archive=originalDownloads.downloads.find(row=>row.path===archivePath);
  assert.ok(archive,'Original approved exercise download required');
  assert.equal(pkg.files[archivePath],archiveSha256,'Retained archive package pin changed');
  assert.equal(archive.sha256,archiveSha256,'Retained archive bytes changed');assert.equal(archive.bytes,archiveBytes,'Retained archive size changed');
  assert.equal(companion.handbookEdition,edition,'Retained sidecar must keep its original edition');
  assert.equal(pkg.files[prefix+'figma-companion.json'],companionSha256,'Retained sidecar bytes changed');
  assert.equal(originalDownloads.downloads.find(row=>row.path===prefix+'figma-companion.json')?.sha256,companionSha256,'Retained sidecar download differs');
  for(const row of downloads.downloads)assert.equal(pkg.files[row.path],row.sha256,'Retained download lost its original approval');
  return {status:'passed',artifactEdition:edition};
}
