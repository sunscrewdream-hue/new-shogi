// Check the staged/committed file list; never remove or rename user assets.
const {execFileSync}=require('node:child_process');
const forbidden=/(^|\/)(?:node_modules|test-results|playwright-report|\.playwright-tmp|ボツ|不採用|rejected|discarded|obsolete|backup|draft)(?:\/|$)|(?:^|\/)[^/]+(?:\.bak|\.orig|\.tmp|\.log|~)$/i;
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const problems=tracked.filter(path=>forbidden.test(path));
if(problems.length){
 console.error('Production repository contains temporary or rejected files:\n'+problems.map(path=>'  '+path).join('\n'));
 console.error('Keep rejected material in the separate archive, not in game paths. No files were deleted.');
 process.exitCode=1;
}else console.log(`Repository hygiene OK (${tracked.length} tracked files)`);
