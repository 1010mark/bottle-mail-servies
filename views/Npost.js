addEventListener('DOMContentLoaded', () => {
    let beforetext = sessionStorage.getItem('text');
    document.textform.speak.value = beforetext;
});
function lengthcount(value){
    document.getElementById('lengthhyoji').textContent = `${value.length}/1500文字`;
};
function check(){
    let sentence = document.textform.speak.value;
    let textlog = JSON.parse(localStorage.getItem('textlog')) || [];
    return new Promise((resolve, reject) => {
        let judgeURL = sentence.match(RegExp('https?://[\w/:%#\$&\?\(\)~\.=\+\-]+')) || [];
        let jadgespace = sentence.match(/^( )*$/) || sentence.match(/^(　)*$/) || sentence.match(/^(\n)*$/) ||[];
        if(document.cookie.match(/toko_aftertime=1/)) reject(['海に流してから30秒間は海に流すことができません。', true]);
        textlog.forEach((text) => {
            if(sentence === text) reject(['すでに伝えたことのある思いです。'])
        });
        if(judgeURL.length !== 0) reject(['URLを伝えることはできません。']);
        if(sentence.length === 0 || jadgespace.length !== 0) reject(['空白の思いを伝えることはできません。']);
        if(sentence.length > 1500) reject(['思いが1500文字を超えてあふれています。']);
        resolve();
    }).then(()=>{
        sendData(sentence);
        textlog.unshift(sentence);
        if(textlog.length > 5) textlog.pop();
        localStorage.setItem('textlog', JSON.stringify(textlog));
    }).catch((rejects)=>{
        let changeplace = document.getElementsByTagName('b')[0];
        changeplace.textContent = rejects[0];
        if(rejects[1]) return false;
        sessionStorage.setItem('text', sentence);
    });
};
function sendData(sentence) {
    let changeplace = document.getElementsByTagName('b')[0];
    let XHR = new XMLHttpRequest();
    XHR.addEventListener("load", (event)=>{
        changeplace.textContent = XHR.response;
        document.textform.speak.value = '';
    });
    XHR.addEventListener("error", (event)=>{
        changeplace.textContent = '何かエラーが起きました。'
    });
    XHR.open("POST", "/toko");
    XHR.send(`speak=${sentence}&form=Yes`);
};
window.addEventListener("load", ()=>{
    document.getElementsByName("textform")[0].addEventListener("submit", (event) => {
        event.preventDefault();
        check();
    });
});