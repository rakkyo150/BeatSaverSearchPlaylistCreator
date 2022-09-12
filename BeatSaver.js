window.onload = start;

function start() {
    var form = document.querySelector("form");
    console.log(form);

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
}

// thenでチェーンすることでPromiseResultが取得できる
// 同期的に処理したいものは全部thenの中に入れとかないと非同期になってします
// asyncで書きたくないのでPromiseを使う

function OnButtonClick() {
    console.log(location.href);
    var playlistName = window.prompt(
        "Please input playlist name without extension",
    );

    if (playlistName == null) return null;

    var params = location.href.replace("https://beatsaver.com/?", "");

    CreateMapDataJson(params)
        .then((playlistJson) => {
            const data = JSON.stringify(playlistJson,null,4);
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


        let pageNumbers = [0,1,2,3,4,5,6,7,8,9];

        let promise = Promise.resolve(playlistJson);

        for(const pageNumber of pageNumbers) {
            promise = promise.then((playlistJson2) => {
                if (pageNumber == 9) {
                    // Promiseを返さないと待ってくれない
                    return RequestBeatSaver(pageNumber,params, playlistJson2)
                        .then((playlistJson3) => resolve(playlistJson3))
                        .catch(() => reject("error"));
                }

                return RequestBeatSaver(pageNumber,params, playlistJson2);
            });
        }

        return promise
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
