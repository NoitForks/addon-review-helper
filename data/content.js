$("div#arh").remove();

let data = [];

let versions = $(".listing-header");
versions.each(function(versionIndex) {
    let number = $(this).text().split("·")[0].replace(/^\s*Version/, "").trim();
    let files = $(".files .file-info", $(this).next());
    let dataFiles = [];
    files.each(function(filesIndex) {
        let fileItem = $("a.editors-install", $(this));
        dataFiles.push({
            fileLink: fileItem.attr("href"),
            validationLink: fileItem.parent().next().next().attr("href"),
            contentsLink: fileItem.parent().next().next().next().attr("href"),
            platform: fileItem.text(),
            status: fileItem.parent().next().text().trim()
        });
    });
    let sourcesLink = $(this).next().find("strong:contains(Additional sources:)").parent().next().children().first().attr("href");
    data.push({
        versionNumber: number,
        files: dataFiles,
        sourcesLink: sourcesLink
    });
});

let table = $("<table>", {
    id: "arh_table"
});

for (let version of data) {
    let row = $("<tr>")
    let colVersion = $("<td>").text(version.versionNumber);
    let colSources = $("<td>").append(createCheckboxedLink("sources-" + version.versionNumber, version.sourcesLink, "Sources"));
    row.append(colVersion).append(colSources).append(createFilesColumns(version.files));
    table.append(row);
}

let buttonRow = $("<div>", {
    id: "arh_button-row"
});
buttonRow.append($("<input>", {
    id: "arh_button_download",
    class: "arh_button",
    type: "button",
    value: "Download",
    disabled: "disabled",
    click: function(event) {
        self.port.emit("download", prepareDownload());
    }
}));

buttonRow.append($("<input>", {
    id: "arh_button_compare-off",
    class: "arh_button",
    type: "button",
    value: "Compare with Client",
    disabled: "disabled",
    click: function(event) {

        self.port.emit("offline-compare", prepareDownload());
    }
}));
buttonRow.append($("<input>", {
    id: "arh_button_compare-on",
    class: "arh_button",
    type: "button",
    value: "Compare on AMO",
    disabled: "disabled",
    click: function(event) {
        let allCheckedCheckboxes = $("#arh_table input:checkbox:checked");
        let fileIds = [];
        allCheckedCheckboxes.each(function(index) {
            fileIds.push($(this).next().prop("href").match(/\/file\/(\d+)\//)[1])
        });
        self.port.emit("openTab", "https://" + location.host + "/firefox/files/compare/" + fileIds.reverse().join("...") + "/");
    }
}));

let outerDiv = $("<div>", {
    id: "arh"
}).append($("<h3>", {
    text: "Files overview:"
})).append($("<div>", {
    id: "arh_border"
}).append($("<div>", {
    id: "arh_inner"
}).append(table).append(buttonRow)));

let reviewAction = $("#review-files-header").next().next();
reviewAction.before(outerDiv);

$("#arh_table input:checkbox").change(function() {
    let allCheckedCheckboxes = $("#arh_table input:checkbox:checked");
    if (allCheckedCheckboxes.size() == 0) {
        $("input:button[id^='arh_button_']").prop("disabled", true);
    } else {
        $("input:button[id^='arh_button_download']").prop("disabled", false);

        let allCheckedSources = $("#arh_table input:checkbox[value^='sources-']:checked");
        let allCheckedFiles = $("#arh_table input:checkbox[value^='file-']:checked");
        if ((allCheckedSources.size() > 0) && (allCheckedFiles.size() > 0)) {
            $("input:button[id^='arh_button_compare-']").prop("disabled", true);
        } else {
            if (allCheckedSources.size() > 0) {
                $("input:button[id^='arh_button_compare-']").prop("disabled", true);
            }
            if (allCheckedSources.size() == 2) {
                $("input:button[id^='arh_button_compare-off']").prop("disabled", false);
            }
            if (allCheckedFiles.size() > 0) {
                $("input:button[id^='arh_button_compare-']").prop("disabled", true);
            }
            if (allCheckedFiles.size() == 2) {
                $("input:button[id^='arh_button_compare-']").prop("disabled", false);
            }
        }
    }
});

function createFilesColumns(files) {
    let fileNameCol = $("<td>");
    let fileValidationCol = $("<td>");
    let fileContentsCol = $("<td>");
    for (let file of files) {
        let fileLink = createCheckboxedLink(`file-${getSlug(file.fileLink)}`, file.fileLink, file.platform);
        switch (file.status) {
            case "Pending Full Review":
                fileLink.last().addClass("arh_file-pending-full");
                break;
            case "Pending Preliminary Review":
                fileLink.last().addClass("arh_file-pending-prelim");
                break;
            case "Rejected":
            case "Rejected or Unreviewed":
                fileLink.last().addClass("arh_file-disabled");
                break;
            case "Fully Reviewed":
                fileLink.last().addClass("arh_file-full");
                break;
            case "Preliminarily Reviewed":
                fileLink.last().addClass("arh_file-prelim");
                break;
        }
        fileNameCol.append(fileLink).append("<br>");
        fileValidationCol.append(createLink(file.validationLink, "Validation")).append("<br>");
        fileContentsCol.append(createLink(file.contentsLink, "Contents")).append("<br>");
    }
    return (fileNameCol).add(fileValidationCol).add(fileContentsCol);
}

function createLink(href, text) {
    if ((!href) || (!text)) return;
    return $("<a>", {
        href: href,
        text: text,
        click: function(event) {
            self.port.emit("download", [{
                downloadPath: event.target.href,
                filename: createTargetFilename(event.target.href, event.target.previousSibling.getAttribute("value").replace(/sources-/, ""))
            }]);
            event.stopPropagation();
            event.preventDefault();
        }
    });
}

function createCheckboxedLink(name, href, text) {
    if ((!name) || (!href) || (!text)) return;
    return $("<input>", {
        type: "checkbox",
        value: name
    }).add(createLink(href, text));
}

function getSlug(path) {
    return path.split("/").pop().split("?").shift();
}

function createTargetFilename(path, version) {
    let name = "unknown-file"
    if (path.match(/\/downloads\/file\/(\d+)\/?/)) {
        name = getSlug(path);
    }
    if (path.match(/\/downloads\/source\/(\d+)\/?/)) {
        let slug = `${getSlug(location.pathname)}`;
        if (slug === "") name = "unknown-file";
        name = `${slug}-${version}-src.zip`;
    }
    if (name == "") name = "unknown-file"
    return name;
}

function prepareDownload() {
    let allCheckedCheckboxes = $("#arh_table input:checkbox:checked");
    let urls = [];
    allCheckedCheckboxes.each(function(index) {
        let path = $(this).next().prop("href");

        urls.push({
            downloadPath: path,
            filename: createTargetFilename(path, $(this).attr("value").replace(/sources-/, ""))
        });
    });
    return urls;
}
