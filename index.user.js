// ==UserScript==
// @name         MastodonTranslate
// @namespace    https://jabberwocky.moe/@alice
// @version      1.21.0
// @description  Provides a translate toot option for Mastodon users via GoogleTranslate. Works with Mastodon 3.2.1
// @author       tomo@uchuu.io / https://niu.moe/@tomo / umonaca / alice@jabberwocky.moe
// @match        https://*/web/*
// @match        https://*/settings/preferences/appearance
// @connect      translate.uchuu.io
// @require      https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @grant        GM.getValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_xmlHttpRequest
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Set Defaults if not set
    if(!localStorage.getItem('toggle')) {
        localStorage.setItem('toggle', GM_getValue('toggle', 'true'));
    }
    if(!localStorage.getItem('lang')) {
        localStorage.setItem('lang', GM_getValue('lang', 'en'));
    }

    function stripMentions(text) {
        var regex = /(@[a-z0-9]+)/;
        var mentions = [];

        var cleanText = text.replace(regex, function(match) {
            mentions.push(match);
            return '';
        }).trim();

        return {
            mentions,
            text: cleanText
        }
    }

    function getTranslation(status, language) {
        var statusDetail = stripMentions(status.querySelector('div.status__content').textContent);
        var encodedText = encodeURIComponent(statusDetail.text);
        var url = "https://translate.uchuu.io/"+language+'/'+encodedText;

        GM.xmlHttpRequest({
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            url: url,
            onload: function(res) {
                var resJson = JSON.parse(res.responseText);
                var translatedText = statusDetail.mentions.join(' ') + ' ' + resJson.text;

                var translateArea = document.createElement('p');
                translateArea.classList.add('toot__translation');
                translateArea.innerHTML = '<br>Translated: '+translatedText;

                status.querySelector('div.status__content').appendChild(translateArea);

                document.querySelector('li.translate__toot').remove();
                if (document.querySelector('div.dropdown-menu') !== null) {
                    status.querySelector('i.fa.fa-ellipsis-h').click();
                }
            },
            onabort: function() {
                console.log('There was an abort');
            },
            ontimeout: function() {
                console.log('It timeout');
            },
            onerror: function() {
                console.log('There was an error');
            }
        });
    }

    function addTranslateLink(status) {
        setTimeout(function() {
            var dropdown = document.querySelector('div.dropdown-menu ul');
            var separator = dropdown.querySelector('li.dropdown-menu__separator');

            var listItem = document.createElement('li');
            listItem.classList.add('dropdown-menu__item');
            listItem.classList.add('translate__toot');

            var link = document.createElement('a');
            link.setAttribute('href', '#');
            link.setAttribute('target', '_blank');
            link.textContent = 'Translate Toot';
            link.addEventListener('click', function(e) {
                e.preventDefault();
                if (localStorage.getItem('toggle') == 'true' && status.querySelectorAll('p.toot__translation').length === 0) {
                    link.textContent = 'Loading...';
                    getTranslation(status, localStorage.getItem('lang'));
                } else if (localStorage.getItem('toggle') == 'false') {
                    window.location.href = window.location.origin + '/settings/preferences#translation_notice';
                }
            }, false);

            listItem.appendChild(link);
            dropdown.insertBefore(listItem, separator);
        }, 100);
    }

    function saveSettings(event) {
        if (event.target.tagName.toLowerCase() === 'button' && event.target.getAttribute('type') === 'submit') {
            event.preventDefault();
            var toggle = document.getElementById('user_translation_enabled');
            var selectedToggle = toggle.checked;
            localStorage.setItem('toggle', selectedToggle);

            var input = document.getElementById('translation_locale');
            var selectedLanguage = input.options[input.selectedIndex].value;
            localStorage.setItem('lang', selectedLanguage);

            setTimeout(function() {
                document.querySelector('body').removeEventListener('click', saveSettings, false);
                actions.children[0].click();
            }, 500);
        }
    }

    function chromeClickChecker(event) {
        return(
            event.target.tagName.toLowerCase() === 'i' &&
            event.target.classList.contains('fa-ellipsis-h') &&
            document.querySelector('div.dropdown-menu') === null
        );
    }

    function firefoxClickChecker(event) {
        return(
            event.target.tagName.toLowerCase() === 'button' &&
            event.target.classList.contains('icon-button') &&
            document.querySelector('div.dropdown-menu') === null
        );
    }

    function activateMastodonTranslate() {
        document.querySelector('body').addEventListener('click', function(event) {
            console.log(event.target.tagName);
            if (chromeClickChecker(event) || firefoxClickChecker(event)) {
                // Get the status for this event
                var status = event.target.parentNode.parentNode.parentNode.parentNode.parentNode;
                addTranslateLink(status);
            }
        }, false);
    }

    // Launch Script
    console.log(`Translate Script v${GM.info.script.version} Activating...`);
    window.addEventListener("load", function() {
        if (window.innerWidth > 630) {
            // Checks we're on a mastodon instance
            var settingsEl = document.querySelector('i.fa.fa-fw.fa-cog').parentElement;
            var settingsUrl = settingsEl.getAttribute('href');
            if (settingsUrl === '/settings/preferences') {
                activateMastodonTranslate();
            } else {
                // Other cases
            }
        } else {
            console.log('Sorry, desktop only');
        }
    }, false);

    if (window.location.pathname === '/settings/preferences/appearance') {
        // We're on the settings page
        var form = document.querySelector('form.simple_form');
        var actions = document.querySelector('div.actions');

        var settingsGroup = form.querySelectorAll('div.fields-group')[2].cloneNode(true);
        settingsGroup.children[0].remove();

        var notice = document.createElement('div');
        var noticeMsg = 'Translation is currently provided by Google Translate, if you\'re not happy with this please don\'t check the checkbox below or just uninstall the script.';
        noticeMsg += '<br>If you have an issue please give me a buzz <a href="https://jabberwocky.moe/@alice">@alice@jabberwocky.moe</a> via mastodon or raise an issue on <a href="https://github.com/umonaca/mastodon-translate/issues">Github</a>';
        notice.setAttribute('id', 'translation_notice');
        notice.classList.add('input');
        notice.classList.add('with_block_label');
        notice.classList.add('check_boxes');
        notice.classList.add('field_with_hint');
        notice.innerHTML = '<label class="check_boxes optional">Translation Script</label><span class="hint">'+noticeMsg+'</span>';

        var toggleArea = document.createElement('ul');
        toggleArea.style.cssText = "-webkit-columns: 1; columns: 1;";
        var toggleInput = document.createElement('li');
        toggleInput.classList.add('checkbox');
        toggleInput.innerHTML = '<label for="user_translation_enabled"><input class="check_boxes optional" type="checkbox" value="1" name="user[translation_enabled]" id="user_translation_enabled">I\'m happy to use Google Translate</label>';
        var checkbox = toggleInput.querySelector('input#user_translation_enabled');
        checkbox.checked = (localStorage.getItem('toggle') == 'true');
        toggleArea.appendChild(toggleInput);

        notice.appendChild(toggleArea);

        var languageArea = form.querySelector('div.fields-group').cloneNode(true);
        languageArea.classList.remove('fields-row__column');
        languageArea.classList.remove('fields-row__column-6');

        var label = languageArea.querySelector(".select .optional[for=user_locale]");
        label.setAttribute('for', 'translation_locale');
        label.textContent = 'Translation Language';

        var selector = languageArea.querySelector("select[name='user[locale]']");
        selector.setAttribute('id', 'translation_locale');
        selector.value = localStorage.getItem('lang');

        settingsGroup.appendChild(notice);
        settingsGroup.appendChild(languageArea);

        form.insertBefore(settingsGroup, form.firstChild);

        document.querySelector('body').addEventListener('click', saveSettings, false);
    }
})();