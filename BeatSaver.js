window.onload = start;

function start() {
    let lastUrl = "";

    // 初回実行の必要あり
    core();

    var main = document.querySelector("main");

    var mo = new MutationObserver(function () {
        let url = location.href;
        console.log(url);
        if (url !== lastUrl) {
            lastUrl = url;
            core();
        }
    });
    var config = {
        childList: true
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

            var form = document.querySelector("body main form");
            console.log(form);

            var div_row_count = form.querySelectorAll("div.row");
            // ボタンの増殖防止
            if (div_row_count.length == 3) return;

            var new_div = document.createElement("div");
            new_div.classList.add("row");
            form.appendChild(new_div);

            var second_div = document.createElement("div");
            second_div.classList.add("mb-3", "d-grid");
            new_div.appendChild(second_div);

            var new_button = document.createElement("button");
            new_button.type = "button";
            new_button.classList.add("btn", "btn-secondary");
            new_button.onclick = OnButtonClick;
            new_button.textContent = "Create Playlist";

            second_div.appendChild(new_button);

            clearInterval(jsInitCheckTimer);
        }
    }
}

// thenでチェーンすることでPromiseResultが取得できる
// 同期的に処理したいものは全部thenの中に入れとかないと非同期になってします
// asyncで書きたくないのでPromiseを使う

function OnButtonClick() {
    console.log(location.href);
    var playlistName = window.prompt(
        "Please input playlist name without extension",
    );

    // キャンセル
    if (playlistName == null) return null;

    var params = "";
    var defaultOrder = "sortOrder=Relevance";

    if (location.href == "https://beatsaver.com/") {
        params = defaultOrder;
    } else if (location.href.match(/order=/)) {
        params = location.href.replace("https://beatsaver.com/?", "").replace('order','sortOrder');
    } else {
        params =
            location.href.replace("https://beatsaver.com/?", "") +'&'+ defaultOrder;
    }

    CreateMapDataJson(params)
        .then((playlistJson) => {
            const data = JSON.stringify(playlistJson, null, 4);
            const link = document.createElement("a");
            link.href = "data:text/plain," + encodeURIComponent(data);
            console.log(link.href);

            link.download = playlistName + ".bplist";

            link.click();
        })
        .catch((error) => {
            throw new Error(error);
        });
}

function CreateMapDataJson(params) {
    return new Promise((resolve, reject) => {
        var playlistJson = {
            playlistTitle: "test",
            playlistAuthor: "test",
            songs: [],
        };

        // 最大200譜面
        let pageNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

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
                    var promise = response.json();
                    return promise;
                } else {
                    throw new Error();
                }
            })
            .then((responseJson) => {
                console.log(responseJson);

                if (responseJson.docs == null) {
                    console.log("null");
                    resolve(playlistJson);
                }

                responseJson.docs.forEach((map) => {
                    playlistJson.songs.push({ hash: map.versions.pop().hash });
                });

                resolve(playlistJson);
            })
            .catch(() => {
                reject("error");
            });
    });
}
