// ==UserScript==
// @name         MLS_Reports
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Addding functionality to MLS search page
// @author       Robert Wlaschin
// @match        https://maxebrdi.paragonrels.com/publink/default.aspx*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    var data = {
        'Address' : [7,10,11,12],
        'Unit #': [9],
        '# Units': [57],
        'List Price': [6],
        'Orig Price': [18],
        'Type': [0,2],
        'Baths' : [49],
        'Partial Baths': [51],
        'Bedrooms' : [39],
        'Garage Spaces' : [43],
        'Stories': [16],
        'Neighborhood': [30],
        'Square Footage': [61],
        'Lot Square Footage': [73],
        'Year Built': [41],
        'Reason': [4],
        'List Date': [22],
        'MLS #': [14]
    }
    var keys = Object.keys(data)
    var filters = { 'Pending Date' : 43, 'COE' : 44 }
    var results = []
    var dump = false
    var $ = window.jQuery
    var jQuery = $
    var $leftPane = $('frame[name=left]')
    var $rightPane = $('frame[name=fraDetail]')
    var $buttons

    results.push( keys.join('\t') + '\r\n' )

    function createMenu() {
        // Create a menu that expands on hover
        var $leftPaneElement = $($leftPane[0].contentDocument)
        if( $leftPaneElement.find('#AgentBioSection').length == 0 ) {
            setTimeout(createMenu,100)
            return
        }
        var $div = $("<div/>", {style:"padding: 2px; background-color: #f5f4ed;"})
               .append($("<div/>", {id:"tm_Menu",text:"Actions",style: "padding: 4px; height: 28px; color: white; font-size: 11pt; background-image: url(images/section-header.gif);" } ))
        var $divb = $("<div/>",{ style: "text-align: center; padding: 5px 0 5px 0; background-color: #f5f4ed;"})
               .append( $("<button/>", {class: "tm_option", type: "button", text: "Expired Report",style:"background: #56b400 none repeat scroll 0 0;border: 1px solid #ddd;border-radius: 4px;color: #fff;cursor: pointer;padding: 7px 14px; width: 75%",
                                        click:(event) => {
                                            if(event.shiftKey == false) {
                                                process()
                                            } else {
                                                dumpData(true)
                                            }
                                        } }))
        $div.append($divb)
        $leftPaneElement.find('#AgentBioSection').before( $div )
        $buttons = $div.find('button')
    }
    function process() {
        disableButtons()
        // get all of the links
        var $leftPaneElement = $($leftPane[0].contentDocument)
        var $navLinks = $leftPaneElement.find('#ListingsSection [id^=Row] a[href]')
        processLink($navLinks, 0)
    }
    function processLink( $links, index ) {
        // try a link, wait for page to load, get data, do next link, ASYNC
        // load and wait
        if( $links.length > index ){
            updateButtons( $links.length - (index+1) )
            var mls = $($links[index]).text().replace(/MLS:\s*/i,"")
            $links[index].click()
            getDataFromLink( mls, $links, index+1 )
            return
        }
        // dump to a csv
        exportcsv(results)
        enableButtons()
    }
    function getDataFromLink( mls, $links, index ) {
        var $rightPaneElement = $($rightPane[0].contentDocument)
        var $contents = $rightPaneElement.find('#divHtmlReport>div').children('div')
        if( $contents.length <= 0 || $contents[69].innerText != mls ) {
            setTimeout( () => {getDataFromLink( mls, $links, index )}, 50 )
            return
        }
        dumpData(dump)
        setTimeout( () => { processLink( $links, index ) }, 0 )
    }
    function dumpData(dump) {
        function _filter(ary,fn) {
            var result = []
            ary.each((index,element)=> {
                if( fn(element) ) {
                    result.push(element)
                }
            })
            return $(result)
        }
        var $rightPaneElement = $($rightPane[0].contentDocument)
        var $contents = _filter($rightPaneElement.find('#divHtmlReport>div')
                 .children('div[style]'),element=>(parseFloat($(element).css('top')) < 288 ) )
        // if COE is not blank .. skip
        var tests = Object.keys(filters).map( key => ( $($contents[filters[key]]).text() ))
                .every((val)=>( val == '' ))
        $contents = $($contents.sort( (a,b) => {
            var $a = $(a), $b = $(b)
            return (parseFloat($a.css('top'))-parseFloat($b.css('top'))) * 10000
            + (parseFloat($a.css('left'))-parseFloat($b.css('left')))
        }))
        // remove fields that don't always appear
        var cnt = 0
        while($($contents[36+cnt]).text() != "Print/Email:") { cnt++ }
        if(cnt>0) { $contents.splice(36,cnt) }
        if( dump ) { $contents.each( (index,item) => { console.log(index,$(item).text()) })
        }
        if( tests ) {
            var info = []
            keys.forEach((key)=>{
                var items = data[key]
                var values = items.map( (i) => (
                    $($contents[i]).text()
                ) )
                if(dump) { console.log( key, values.join(' ') ) }
                info.push( values.join(' ') )
            })
            results.push(info.join('\t') + "\r\n" )
        }
    }
    function exportcsv(results) {
        if(dump) { console.log(results) }
        var blob = new Blob(results, {type: "application/csv;charset=utf-8"});
        saveAs(blob, "mls_exports_"+Date.now()+".csv");
    }

    function disableButtons() {
        $buttons.attr("disabled","disabled");
        $buttons.each((indx,item) => {
            var $itm = $(item)
            $itm.attr("data-text",$itm.text());
        })
    }
    function updateButtons(text) {
        $buttons.text( text )
    }
    function enableButtons() {
        $buttons.each((indx,item) => {
            var $itm = $(item)
            $itm.text($itm.attr("data-text"));
        })
        $buttons.removeAttr("disabled");
    }


    createMenu()
})();

function click(node) {
  try {
    node.dispatchEvent(new MouseEvent('click'))
  } catch (e) {
    var evt = document.createEvent('MouseEvents')
    evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80,
                          20, false, false, false, false, 0, null)
    node.dispatchEvent(evt)
  }
}

function download (url, name, opts) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'blob'
    xhr.onload = function () {
        saveAs(xhr.response, name, opts)
    }
    xhr.onerror = function () {
        console.error('could not download file')
    }
    xhr.send()
}

function corsEnabled (url) {
    var xhr = new XMLHttpRequest()
    // use sync to avoid popup blocker
    xhr.open('HEAD', url, false)
    xhr.send()
    return xhr.status >= 200 && xhr.status <= 299
}

function saveAs(blob, name, opts) {
    var URL = window.URL || window.webkitURL
    var a = document.createElement('a')
    name = name || blob.name || 'download'

    a.download = name
    a.rel = 'noopener' // tabnabbing

    // TODO: detect chrome extensions & packaged apps
    // a.target = '_blank'

    if (typeof blob === 'string') {
        // Support regular links
        a.href = blob
        if (a.origin !== location.origin) {
            corsEnabled(a.href)
                ? download(blob, name, opts)
            : click(a, a.target = '_blank')
        } else {
            click(a)
        }
    } else {
        // Support blobs
        a.href = URL.createObjectURL(blob)
        setTimeout(function () { URL.revokeObjectURL(a.href) }, 4E4) // 40s
        setTimeout(function () { click(a) }, 0)
    }
}
