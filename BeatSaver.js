window.onload = start;

let progress_bar;
let playlistName="";

function start() {
    let lastUrl = "";

    // 一回実行しないと最初ボタンが出てきてくれない
    core();

    const main = document.querySelector("main");

    const mo = new MutationObserver(function () {
        let url = location.href;
        console.log(url);
        if (url !== lastUrl) {
            lastUrl = url;
            core();
        }
    });
    const config = {
        childList: true,
    };
    mo.observe(main, config);
}

function core() {
    let retryCount = 0;
    const maxRetry = 3;
    const jsInitCheckTimer = setInterval(jsLoaded, 1000);
    function jsLoaded() {
        if (document.querySelector("body main form") == null) {
            retryCount++;
            if (retryCount == maxRetry) {
                console.log("3秒間必要な要素が見つからなかったので終了");
                clearInterval(jsInitCheckTimer);
            }
        } else {
            let searchUrl = "https://beatsaver.com/?";

            if (
                location.href != "https://beatsaver.com/" &&
                !location.href.match(searchUrl)
            ) {
                console.log("urlout");
                return;
            }

            const form = document.querySelector("body main form");
            console.log(form);

            const div_row_count = form.querySelectorAll("div.row");
            // ボタンの増殖防止
            if (div_row_count.length == 3) return;

            const new_div = document.createElement("div");
            new_div.classList.add("row");
            form.appendChild(new_div);

            const second_div = document.createElement("div");
            second_div.classList.add("mb-3", "d-grid");
            new_div.appendChild(second_div);

            const new_button = document.createElement("button");
            new_button.type = "button";
            new_button.classList.add("btn", "btn-secondary");
            new_button.onclick = OnButtonClick;
            new_button.textContent = "Create Playlist";

            second_div.appendChild(new_button);

            const progress_div = document.createElement("div");
            progress_div.classList.add("progress");
            progress_div.style = "height: 5px;";
            second_div.appendChild(progress_div);

            progress_bar = document.createElement("div");
            progress_bar.classList.add("progress-bar");
            progress_bar.setAttribute("role", "progressbar");
            progress_bar.style = "width: 0%;";
            progress_bar.setAttribute("aria-valuenow", "0");
            progress_bar.setAttribute("aria-valuemin", "0");
            progress_bar.setAttribute("aria-valuemax", "100");
            progress_div.appendChild(progress_bar);

            clearInterval(jsInitCheckTimer);
        }
    }
}

// thenでチェーンすることでPromiseResultが取得できる
// 同期的に処理したいものは全部thenの中に入れとかないと非同期になってします
// asyncで書きたくないのでPromiseを使う

function OnButtonClick() {
    console.log(location.href);
    playlistName = window.prompt(
        "Please input playlist name without extension",
    );

    // キャンセル
    if (playlistName == null) return null;

    let params = "";
    const defaultOrder = "sortOrder=Relevance";

    if (location.href == "https://beatsaver.com/") {
        params = defaultOrder;
    } else if (location.href.match(/order=/)) {
        params = location.href
            .replace("https://beatsaver.com/?", "")
            .replace("order", "sortOrder");
    } else {
        params =
            location.href.replace("https://beatsaver.com/?", "") +
            "&" +
            defaultOrder;
    }

    CreateMapDataJson(params)
        .then((playlistJson) => {
            const data = JSON.stringify(playlistJson, null, 4);
            const link = document.createElement("a");
            link.href = "data:text/plain," + encodeURIComponent(data);
            console.log(link.href);

            link.download = playlistName + ".bplist";

            link.click();

            progress_bar.style = `width: 0%;`;
            progress_bar.setAttribute("aria-valuenow", "0");
        })
        .catch((error) => {
            throw new Error(error);
        });
}

function CreateMapDataJson(params) {
    return new Promise((resolve, reject) => {
        let playlistJson = {
            playlistTitle: playlistName,
            playlistAuthor: "BeatSaverSearchPlaylistCreator",
            songs: [],
            params: params,
            image: "base64," + base64Image
        };

        // 最大20譜面×10ページの200譜面
        const pageNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        let promise = Promise.resolve(playlistJson);

        for (const pageNumber of pageNumbers) {
            promise = promise.then((playlistJson2) => {
                if (pageNumber == 9) {
                    // Promiseを返さないと待ってくれない
                    return RequestBeatSaver(pageNumber, params, playlistJson2)
                        .then((playlistJson3) => resolve(playlistJson3))
                        .catch(() => reject("error"));
                }

                return RequestBeatSaver(pageNumber, params, playlistJson2);
            });
        }

        return promise;
    });
}

function RequestBeatSaver(page, params, playlistJson) {
    return new Promise((resolve, reject) => {
        fetch(`https://api.beatsaver.com/search/text/${page}?${params}`, {
            mode: "cors",
            method: "GET",
        })
            .then((response) => {
                if (response.ok) {
                    console.log(response);
                    const promise = response.json();
                    return promise;
                } else {
                    throw new Error();
                }
            })
            .then((responseJson) => {
                console.log(responseJson);
                const progressPercentage = (page + 1) * 10;

                if (responseJson.docs == null) {
                    console.log("null");
                    progress_bar.style = `width: ${progressPercentage}%;`;
                    progress_bar.setAttribute(
                        "aria-valuenow",
                        `${progressPercentage}`,
                    );
                    resolve(playlistJson);
                }

                responseJson.docs.forEach((map) => {
                    playlistJson.songs.push(
                        {
                            songName: map.name,
                            hash: map.versions.pop().hash
                        });
                });

                progress_bar.style = `width: ${progressPercentage}%;`;
                progress_bar.setAttribute(
                    "aria-valuenow",
                    `${progressPercentage}`,
                );
                resolve(playlistJson);
            })
            .catch(() => {
                reject("error");
            });
    });
}

const base64Image = "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"

