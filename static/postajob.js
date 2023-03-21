// next buttons classes, one, two, submit
// form classes, first, second, third
// back classes, backtwo, backthree

// const e = require("express");

let first = document.getElementById('first');
let second = document.getElementById('second');
let third = document.getElementById('third');
let one = document.getElementById('one');
let two = document.getElementById('two');
let backtwo = document.getElementById('backtwo');
let backthree = document.getElementById('backthree');
let submit = document.getElementById('submit');



one.addEventListener('click', ()=>{
    
    first.classList.add("disappear");
    second.classList.remove("disappear");
})

two.addEventListener('click', ()=>{
    second.classList.add("disappear");
    third.classList.remove("disappear");
})

backtwo.addEventListener('click', ()=>{
    second.classList.add("disappear");
    first.classList.remove("disappear");
})

backthree.addEventListener('click', ()=>{
    third.classList.add("disappear");
    second.classList.remove("disappear");
})

var date = new Date();


