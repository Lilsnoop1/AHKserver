import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth"


puppeteer.use(StealthPlugin());

import { executablePath } from "puppeteer";
export default async function getData (source){
    try{

    const browser = await puppeteer.launch({headless:true, executablePath:executablePath()});
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.goto(source,{waitUntil:"load"});
    async function autoScroll(page){
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                var totalHeight = 0;
                var distance = 100;
                var timer = setInterval(() => {
                    var scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
    
                    if(totalHeight >= scrollHeight - window.innerHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    }
    await autoScroll(page);
    const grabTitle = await page.evaluate(()=>{
        var objectJson=[];
        var titlearr = [];
        var radiologyarr = [];
        var imgurlarr = [];
        var pricearr = [];
        var counter = 0;
        const title = document.querySelectorAll(".grid-link__title");
        const imgURL = document.querySelectorAll(".featured-image");
        const price = document.querySelectorAll("#ProductPrice");
        const radiology = document.querySelectorAll(".menu-lv-3");
        title.forEach((heading)=>{
            titlearr.push(heading.innerText);
            counter++;
        })
        imgURL.forEach((url)=>{
            // const source = url.firstElementChild.src;
            // const altersource = source.slice(0,source.length-20);
            imgurlarr.push(url.src);
        })
        price.forEach((pr)=>{
            pricearr.push(pr.innerText);
        })
        radiology.forEach((rad)=>{
            radiologyarr.push(rad.children[0].textContent);
        })
        for(let x = 0;x<counter;x++){
            objectJson.push({"imgurl":imgurlarr[x],"Title":titlearr[x],"Price":pricearr[x],"id":x});
        }
        return objectJson; 
    });
    return grabTitle;
    }catch(error){
        console.log(error);
    }
};
