const fs=require("fs");
const code=fs.readFileSync("public/script.js","utf8");
let state="normal";
let line=1,col=0,startLine=0,startCol=0;
for(let i=0;i<code.length;i++){
  const ch=code[i];
  col++;
  if(ch==="\\n"){line++;col=0;}
  if(state==="normal"){
    if(ch==="\\\""||ch==="'") {state=ch;startLine=line;startCol=col;}
    else if(ch==="`") {state="`";startLine=line;startCol=col;}
    else if(ch==="/" && code[i+1]==="/") {state="line-comment";}
    else if(ch==="/" && code[i+1]==="*") {state="block-comment";}
  } else if(state==="line-comment") {
    if(ch==="\\n") state="normal";
  } else if(state==="block-comment") {
    if(ch==="*" && code[i+1]==="/") {state="normal";i++;col++;}
  } else if(state==="\\\"" || state==="'") {
    if(ch==="\\\\") {i++;col++;}
    else if(ch===state) {state="normal";}
  } else if(state==="`") {
    if(ch==="\\\\") {i++;col++;}
    else if(ch==="`") {state="normal";}
  }
}
if(state!=="normal"){
  console.log("Unclosed",state,"starting at",startLine+":"+startCol);
} else {
  console.log("Strings OK");
}
