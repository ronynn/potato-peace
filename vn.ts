let story: any;
(function(storyContent: string) {
    // These keys cause the text to advance.
    const continueKeys: Set<string> = new Set([' ', 'Enter']);

    // Ignore clicks/keypresses on anything in one of these CSS selectors.
    // Any selector should work, so also things like '.myClass' or '#myID'
    const noContinue: Set<string> = new Set(['a', 'button', 'input', 'textarea']);

    story = new inkjs.Story(storyContent);
    let storyContainer: Element = document.querySelectorAll('.chat')[0];
    const historyContainer: Element = document.getElementById('old-chat');
    const chatHistory: Element = historyContainer.querySelectorAll('.chat-history')[0];
    let choicePoint: any;

    const menuParent = (elt: Element): Element => {
        do {
            elt = elt.parentNode as Element;
        } while(elt != null && !elt.classList.contains('menu'));
        return elt;
    };
    for(const b of document.querySelectorAll('button.close')) {
        const m = menuParent(b);
        if(m != null) {
            N(b, {'click': (e: Event) => { m.classList.remove('show'); }});
        }
    }

    N(document.body, {'keydown': (e: KeyboardEvent) => {
        const menu = document.body.querySelector('.menu.show');
        if(menu == null) return;
        const modifiers = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey;
        if(!modifiers && e.key === 'Escape') menu.classList.remove('show');
    }});

    const saveMenu: Element = document.getElementById('save-menu');
    N(document.getElementById('save'), {'click': (e: Event) => {
        saveMenu.classList.add('show');
        saveMenu.querySelector('.close').focus();
    }});
    N(document.getElementById('save-browser'), {'click': (e: Event) => {
        saveGame();
        saveMenu.classList.remove('show');
    }});
    N(document.getElementById('load-browser'), {'click': (e: Event) => {
        loadGameFromBrowser();
        saveMenu.classList.remove('show');
    }});
    N(document.getElementById('save-file'), {'click': (e: Event) => {
        const data = URL.createObjectURL(new Blob([JSON.stringify(gameState())]));
        const link = N('a', {
            href: data,
            download: 'ink-vn-save.json',
            style: {visibility: 'hidden'}
        });
        N(saveMenu, link);
        link.click();
        link.remove();
        saveMenu.classList.remove('show');
    }});
    const loadButton: Element = document.getElementById('load-file');
    N(loadButton, {change: (e: Event) => {
        e.preventDefault();
        const file = (loadButton as HTMLInputElement).files[0];
        if(file == null) return;
        file.text().then(json => {
            loadGame(JSON.parse(json), file.name);
            saveMenu.classList.remove('show');
        });
    }});

    N(document.getElementById('theme'), {'click': (e: Event) => {
        setTheme(!document.documentElement.classList.contains('dark'));
    }});
    N(document.getElementById('history'), {'click': (e: Event) => {
        historyContainer.classList.add('show');
        historyContainer.querySelector('.close').focus();
    }});
    const confirmRestart: Element = document.getElementById('confirm-restart');
    N(document.getElementById('restart'), {'click': (e: Event) => {
        confirmRestart.classList.add('show');
    }});
    N(document.getElementById('yes-restart'), {'click': (e: Event) => {
        confirmRestart.classList.remove('show');
        restart();
    }});
    N(document.getElementById('no-restart'), {'click': (e: Event) => {
        confirmRestart.classList.remove('show');
    }});

    let speechTags: { player_tag: string, speaker_tag: string } = { player_tag: "Me", speaker_tag: "" };
    const speechTagName = (isPlayer: boolean): string => isPlayer ? 'player_tag' : 'speaker_tag';

    function stripSpeechTag(text: string, isPlayer: boolean): string {
        const m = /^([A-Z]\S*):\s+/.exec(text);
        if(m) {
            const varName = speechTagName(isPlayer);
            text = text.substr(m[0].length);
            speechTags[varName] = m[1];
            if(story.variablesState[varName] != null) {
                story.variablesState[varName] = m[1];
            }
        }
        return text;
    }

    function addSpeechTag(text: string, isPlayer: boolean): string {
        let strip = story.variablesState.strip_speaker_tags;
        if(strip == null) strip = 'player';
        if(!strip || (strip == 'player' && !isPlayer)) {
            text = speechTags[speechTagName(isPlayer)] + ': ' + text;
        }
        return text;
    }

    function getInkSpeechTag(isPlayer: boolean): void {
        const varName = speechTagName(isPlayer);
        const inkVar = story.variablesState[varName];
        if(inkVar != null) speechTags[varName] = inkVar;
    }

    const images: { [tag: string]: any } = {};
    function clearImage(tag: string): void {
        const img = images[tag];
        if(img && img.elt) {
            img.elt.remove();
            delete img.elt;
            delete images[tag];
            if(tag === 'bg') delete camera.style['background-image'];
        }
    }
    function setImage(str: string): void {
        const err = (): void => { throw new Error("invalid image command: #" + str); };
        const args = str.trim().split(/\s+/);
        if(!/:$/.test(args[0])) err();
        const tag = args.shift().slice(0, -1).toLowerCase();
        let img = images[tag];
        let file, coords = [];
        for(let i = 0; i < args.length; ++i) {
            const n = Number(args[i]);
            if(n === n) coords.push(n);
            else if(file == null) file = args[i];
            else err();
        }
        const cameras = document.querySelectorAll('.camera');
        const camera = cameras[0].firstElementChild as HTMLElement;
        if(file == null && coords.length === 0) {
            clearImage(tag);
            return;
        } else if(tag == 'bg') {
            if(file == null || coords.length !== 0) err();
            camera.style['background-image'] = 'url("img/' + file + '")';
            images.bg = { tag: tag, img: file };
            return;
        } else if(img == null) {
            if(file == null || coords.length !== 3) err();
            img = images[tag] = { tag: tag };
        }

        if(file != null && file !== img.file) {
            const src = 'img/' + file;
            if(img.elt) img.elt.src = src;
            else {
                img.elt = N('img', {src: src, style: {position: 'absolute'}});
                N(camera, img.elt);
            }
            img.file = file;
        }
        img.x = coords[0] ?? img.x;
        img.y = coords[1] ?? img.y;
        img.w = coords[2] ?? img.w;
        const ox = -img.x, oy = -img.y;
        N(img.elt, {style: {
            left: img.x + '%',
            top: img.y + '%',
            transform: 'translate(' + ox + '%, ' + oy + '%)',
            width: img.w + '%'
        }});
    }

    function isInSelector(elt: Element, selector: string): boolean {
        while(elt && elt.matches) {
            if(elt.matches(selector)) return true;
            elt = elt.parentNode as Element;
        }
        return false;
    }

    function choose(event: Event): void {
        event.preventDefault();

        getInkSpeechTag(true);
        const p = N('p');
        while(this.firstChild != null) p.appendChild(this.firstChild);
        p.innerHTML = stripSpeechTag(p.innerHTML, true);
        addHistoryLine(p, speechTags.player_tag);

        const existingChoices = storyContainer.querySelectorAll('p.choice');
        for(const c of existingChoices) c.remove();

        story.ChooseChoiceIndex(+this.dataset.index);
        choicePoint = story.state.toJson();
        continueStory();
    }

    function setTheme(dark?: boolean): void {
        try {
            if(dark == null) {
                dark = window.localStorage.getItem('theme') === 'dark';
            }
            if(dark == null) {
                for(const t of story.globalTags) {
                    const m = /^([^:])+:(.*)$/.exec(t.trim().toLowerCase());
                    if(m && m[1] == 'theme') {
                        dark = m[2] === 'dark';
                        break;
                    }
                }
            }
            if(dark == null) {
                const m = "(prefers-color-scheme: dark)";
                dark = window.matchMedia(m).matches;
            }
            const classes = document.documentElement.classList;
            if(dark) classes.add('dark');
            else classes.remove('dark');
            window.localStorage.setItem('theme', dark ? 'dark' : '');
        } catch(e) {
            console.warn("Couldn't set/save theme");
        }
    }

    function serializeImages(): string[] {
        const out: string[] = [];
        for(const tag in images) {
            const i = images[tag];
            out.push([tag + ':', i.file, i.x, i.y, i.w].join(' '));
        }
        return out;
    }
    function deserializeImages(images: string[]): void {
        for(const i of images) setImage(i);
    }
    function gameState(): any {
        return {
            ink: choicePoint,
            alert: document.body.classList.contains('alert'),
            speechTags: speechTags,
            img: serializeImages(images)
        };
    }
    function loadGame(state: any, name: string): boolean {
        try {
            clearContent();
            if(state.ink.alert) document.body.classList.add('alert');
            story.state.LoadJson(state.ink);
            choicePoint = story.state.toJson();
            speechTags = state.speechTags;
            deserializeImages(state.img);
            continueStory();
            return true;
        } catch(e) {
            console.debug("Couldn't load game \"" + name + "\"", e);
        }
        return false;
    }
    function saveGame(name?: string): void {
        name = name ?? 'default';
        try {
            window.localStorage.setItem(name, JSON.stringify(gameState()));
        } catch(e) {
            console.warn("Couldn't save game \"" + name + "\"");
        }
    }

    function loadGameFromBrowser(name?: string): boolean {
        name = name ?? 'default';
        try {
            let state = window.localStorage.getItem(name);
            if(state) return loadGame(JSON.parse(state), name);
        } catch(e) {
            console.debug("Couldn't load game \"" + name + "\"", e);
        }
        return false;
    }

    function clearContent(): void {
        for(const tag in images) clearImage(tag);
        document.body.classList.remove('alert');
        document.querySelector('.chat').textContent = '';
        chatHistory.textContent = '';
    }

    function restart(): void {
        clearContent();
        story.ResetState();
        choicePoint = story.state.toJson();
        continueStory();
    }

    function splitTag(t: string): { property: string, value: string } | null {
        let split = /([^:]+):(.*)/.exec(t);
        if(split != null) {
            split = {
                property: split[1].toLowerCase(),
                value: split[2].trim()
            };
        }
        return split;
    }

    let currentAudio: HTMLAudioElement | null = null;

    function continueStory(): void {
        if(story.canContinue) {
            let text = story.Continue().trim();
            text = stripSpeechTag(text);
            for(const t of story.currentTags) {
                const lower = t.trim().toLowerCase();
                const split = splitTag(t);
                if(split?.property === 'audio') {
                    if(currentAudio) {
                        currentAudio.pause();
                        currentAudio.removeAttribute('src');
                        currentAudio.load();
                    }
                    currentAudio = new Audio(split.value);
                    currentAudio.play();
                } else if(lower === 'alert') {
                    document.body.classList.add('alert');
                } else if(lower === 'dialogue') {
                    document.body.classList.remove('alert');
                } else if(lower === 'restart') {
                    restart();
                    return;
                } else if(/^img\s/.test(lower)) setImage(t.substring(3).trim());
            }
            storyContainer.replaceChildren();
            if(text !== '') {
                const p = N('p', {class: 'text'});
                p.innerHTML = addSpeechTag(text);
                storyContainer.appendChild(p);
                getInkSpeechTag();
                const logLine = N('p', {class: 'text'});
                logLine.innerHTML = text;
                addHistoryLine(logLine, speechTags.speaker_tag);
            }
        }
        // Render choices, if not already rendered.
        if(!story.canContinue && storyContainer.querySelectorAll('.choice').length === 0) {
            if(document.body.classList.contains('alert')) {
                // Alert box: single paragraph with buttons.
                const p = N('p', {class: 'choice'});
                story.currentChoices.forEach((choice: any) => {
                    const i = choice.index;
                    const t = stripSpeechTag(choice.text, true);
                    const b = N('button', {click: choose, 'data-index': i});
                    b.innerHTML = addSpeechTag(t, true);
                    N(p, b);
                });
                N(storyContainer, p);
            } else {
                // Regular dialogue: links on separate lines.
                story.currentChoices.forEach((choice: any) => {
                    const i = choice.index;
                    const t = stripSpeechTag(choice.text, true);
                    const a = N('a', {href: '#', click: choose, 'data-index': i});
                    a.innerHTML = addSpeechTag(t, true);
                    N(storyContainer, N('p', a, {class: 'choice'}));
                });
            }
        }
        if(storyContainer.querySelector('.continue')) return;
        // Detect end of story.
        if(!story.canContinue && story.currentChoices.length === 0) return;
        const paras = storyContainer.querySelectorAll('p');
        const last = paras[paras.length - 1];
        if(last && last.classList.contains('text')) {
            N(last, N('br'), N('button', "➔", {
                class: 'continue',
                'aria-label': 'continue',
                'click': (e: Event) => { continueStory(); }
            }));
        }
    }

    function maybeContinue(ev: Event | null): void {
        // Not if a menu is showing
        const menus = document.querySelectorAll('.menu');
        for(const menu of menus) {
            if(menu.classList.contains('show')) return;
        }

        // Ignore these elements.
        if(ev) for(const selector of noContinue) {
            if(isInSelector(ev.target as Element, selector)) return;
        }

        const existingChoices = storyContainer.querySelectorAll('p.choice');
        if(existingChoices.length === 0) {
            // We're doing the special thing, prevent the default behavior
            ev && ev.preventDefault();
            continueStory();
        }
    }

    const html = document.documentElement;
    N(html, {
        click: maybeContinue,
        keypress: function(ev: KeyboardEvent) {
            const modifiers = ev.ctrlKey || ev.altKey || ev.shiftKey;
            if(continueKeys.has(ev.key) && !modifiers) {
                maybeContinue(ev);
            }
        }
    });

    function addHistoryLine(elt: Element, charName: string): void {
        charName = charName ? charName + ':' : '';
        N(chatHistory, N('p', charName, {class: 'char-name'}), elt);
    }

    setTheme();
    let urlTarget = false;
    if(window.location.hash !== '') {
        try {
            urlTarget = true;
            story.ChoosePathString(window.location.hash.substr(1));
        } catch(e) {
            urlTarget = false;
            console.debug("URL hash not a valid knot/stitch.");
        }
    }
    if(urlTarget || !loadGameFromBrowser()) {
        choicePoint = story.state.toJson();
        continueStory();
    }

})(storyContent);