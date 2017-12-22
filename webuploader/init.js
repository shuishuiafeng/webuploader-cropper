jQuery(function() {
    var $ = jQuery;
    $.fn.webupload_fileinput = function (config) {

        if(config.pick.multiple != undefined && config.pick.multiple != null && config.pick.multiple == true) {
            /*
             多图上传也有可能是针对微信端的
             */
            if(config['platform'] != undefined && config['platform'] == "wechat"){

                function imagesAjaxforWechat(src,name) {
                    var uploadfieldName = (config['uploadFieldName']!=undefined&&config['uploadFieldName']!=null)?config['uploadFieldName']:'file';
                    var data = {};
                    data[uploadfieldName] = src;//单图上传，和webuploader没关系
                    data.postname = uploadfieldName;
                    $.ajax({
                        url: config['server'],
                        data: data,
                        type: "POST",
                        dataType: 'json',
                        async: false,
                        success: function (re) {
                            if(re.state == 'SUCCESS'){
                                $('.' + config['modal_id']).parent().prev().val(re.url);
                                chooseObject.parent().parent().next().append('<div class="multi-item"><img src="'+re.url+'" class="img-responsive img-thumbnail cus-img"><input type="hidden" name="'+name+'[]" value="'+re.url+'"><em class="close delMultiImage" title="删除这张图片">×</em></div>');
                            }else {
                                alert(re.state);
                            }
                        }
                    });
                }
                $('.'+config['modal_id']).on('click',function(){
                    chooseObject = $(this);
                    var name = chooseObject.parent().prev().attr('name');
                    wx.chooseImage({
                        count: config.pick.multiple ? config.fileNumLimit : 1, // 默认9
                        sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
                        sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
                        success: function (res) {
                            var localIds = res.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片
                            $.each(localIds,function (k,v) {
                                wx.getLocalImgData({
                                    localId: v, // 图片的localID
                                    success: function (res) {
                                        var localData = res.localData; // localData是图片的base64数据，可以用img标签显示
                                        imagesAjaxforWechat(localData,name);
                                    }
                                });
                            })
                        }
                    });
                });

                function uploadwximage(e){

                }

            }else{
                var usehistoryimages = new Array();
                $('body').append(renderModal());
                var _modal = $('#' + config['modal_id']),
                    chooseObject; // 点击选择图片的按钮

                _modal.on("shown.bs.modal", init);

                function init () {//太太卡了打开文件选择器，修修
                    var $wrap = $('#uploader'),
                        // 图片容器
                        $queue = $('<ul class="filelist"></ul>').appendTo( $wrap.find('.queueList') ),
                        // 状态栏，包括进度和控制按钮
                        $statusBar = $wrap.find('.statusBar'),
                        // 文件总体选择信息。
                        $info = $statusBar.find('.info'),
                        // 上传按钮
                        $upload = $wrap.find('.uploadBtn'),
                        // 没选择文件之前的内容。
                        $placeHolder = $wrap.find('.placeholder'),
                        // 总体进度条
                        $progress = $statusBar.find('.progress').hide(),
                        // 添加的文件数量
                        fileCount = 0,
                        // 添加的文件总大小
                        fileSize = 0,
                        // 优化retina, 在retina下这个值是2
                        ratio = window.devicePixelRatio || 1,
                        // 缩略图大小
                        thumbnailWidth = 110 * ratio,
                        thumbnailHeight = 110 * ratio,
                        // 可能有pedding, ready, uploading, confirm, done.
                        state = 'pedding',
                        // 所有文件的进度信息，key为file id
                        percentages = {},
                        supportTransition = (function(){
                            var s = document.createElement('p').style,
                                r = 'transition' in s ||
                                    'WebkitTransition' in s ||
                                    'MozTransition' in s ||
                                    'msTransition' in s ||
                                    'OTransition' in s;
                            s = null;
                            return r;
                        })(),
                        uploadedFiles = [], // 成功上传的图片信息
                        k = 0,
                        $r = $('<li class="fileinput-button js-add-image" id="filePicker2" style="display:none;"> <a href="javascript:;" class="fileinput-button-icon">+</a></li>').appendTo($wrap.find('.filelist')),
                        // WebUploader实例
                        uploader;
                    if ( !WebUploader.Uploader.support() ) {
                        alert( 'Web Uploader 不支持您的浏览器！如果你使用的是IE浏览器，请尝试升级 flash 播放器');
                        throw new Error( 'WebUploader does not support the browser you are using.' );
                    }
                    if (config.compress == undefined) {
                        config.compress = {};
                    }

                    // 实例化
                    uploader = WebUploader.create({
                        pick: {
                            id: '#filePicker',
                            label: '点击选择图片',
                            multiple: config.pick.multiple
                        },
                        dnd: '#uploader .queueList',
                        paste: document.body,
                        accept: config.accept,
                        swf: './webuploader/Uploader.swf',
                        server: config.server,
                        fileVal:config.uploadFieldName,
                        formData: config.formData,
                        disableGlobalDnd: config.disableGlobalDnd,
                        chunked: config.chunked,
                        fileNumLimit: config.pick.multiple ? config.fileNumLimit : 1,
                        fileSizeLimit: config.fileSizeLimit,
                        fileSingleSizeLimit: config.fileSingleSizeLimit,
                        compress: {
                            width: config.compress.width,
                            height: config.compress.height,
                            quality: config.compress.quality,
                            allowMagnify: config.compress.allowMagnify,
                            crop: config.compress.crop,
                            preserveHeaders: config.compress.preserveHeaders,
                            noCompressIfLarger: config.compress.noCompressIfLarger,
                            compressSize: config.compress.compressSize
                        }
                    });

                    uploader.on('uploadBeforeSend', function( block, data, headers) {//文件上传前添加参数
                        $.extend(data, {
                            'uploadFieldName': config.uploadFieldName
                        });
                    });

                    // 添加“添加文件”的按钮，
                    uploader.addButton({
                        id: '#filePicker2',
                        label: '+',
                        multiple: config.pick.multiple
                    });

                    // 当有文件添加进来时执行，负责view的创建
                    function addFile( file ) {
                        var $li = $( '<li id="' + file.id + '">' +
                                '<p class="title">' + file.name + '</p>' +
                                '<p class="imgWrap"></p>'+
                                '</li>' ),
                            $btns = $('<div class="file-panel">' +
                                '<span class="cancel">删除</span>' +
                                '<span class="rotateRight">向右旋转</span>' +
                                '<span class="rotateLeft">向左旋转</span></div>').appendTo( $li ),
                            $prgress = $li.find('p.progress span'),
                            $wrap = $li.find( 'p.imgWrap' ),
                            $info = $('<p class="error"></p>'),
                            showError = function( code ) {
                                switch( code ) {
                                    case 'exceed_size':
                                        text = '文件大小超出';
                                        break;
                                    case 'interrupt':
                                        text = '上传暂停';
                                        break;
                                    default:
                                        text = '上传失败，请重试';
                                        break;
                                }
                                $info.text( text ).appendTo( $li );
                            };
                        if ( file.getStatus() === 'invalid' ) {
                            showError( file.statusText );
                        } else {
                            // @todo lazyload
                            $wrap.text( '预览中' );
                            uploader.makeThumb( file, function( error, src ) {
                                if ( error ) {
                                    $wrap.text( '不能预览' );
                                    return;
                                }
                                var img = $('<img src="'+src+'">');
                                $wrap.empty().append( img );
                            }, thumbnailWidth, thumbnailHeight );
                            percentages[ file.id ] = [ file.size, 0 ];
                            file.rotation = 0;
                        }
                        file.on('statuschange', function( cur, prev ) {

                            if ( prev === 'progress' ) {
                                $prgress.hide().width(0);
                            } else if ( prev === 'queued' ) {
                                $li.off( 'mouseenter mouseleave' );
                                $btns.remove();
                            }
                            // 成功
                            if ( cur === 'error' || cur === 'invalid' ) {
                                showError( file.statusText );
                                percentages[ file.id ][ 1 ] = 1;
                            } else if ( cur === 'interrupt' ) {
                                showError( 'interrupt' );
                            } else if ( cur === 'queued' ) {
                                percentages[ file.id ][ 1 ] = 0;
                            } else if ( cur === 'progress' ) {
                                $info.remove();
                                $prgress.css('display', 'block');
                            } else if ( cur === 'complete' ) {
                                $li.append( '<span class="success"></span>' );
                            }
                            $li.removeClass( 'state-' + prev ).addClass( 'state-' + cur );
                        });
                        $li.on( 'mouseenter', function() {
                            $btns.stop().animate({height: 30});
                        });
                        $li.on( 'mouseleave', function() {
                            $btns.stop().animate({height: 0});
                        });
                        $btns.on( 'click', 'span', function() {
                            var index = $(this).index(),
                                deg;
                            switch ( index ) {
                                case 0:
                                    uploader.removeFile( file );
                                    return;
                                case 1:
                                    file.rotation += 90;
                                    break;
                                case 2:
                                    file.rotation -= 90;
                                    break;
                            }
                            if ( supportTransition ) {
                                deg = 'rotate(' + file.rotation + 'deg)';
                                $wrap.css({
                                    '-webkit-transform': deg,
                                    '-mos-transform': deg,
                                    '-o-transform': deg,
                                    'transform': deg
                                });
                            } else {
                                $wrap.css( 'filter', 'progid:DXImageTransform.Microsoft.BasicImage(rotation='+ (~~((file.rotation/90)%4 + 4)%4) +')');
                            }
                        });
                        config.pick.multiple && $r.find(".fileinput-button").show(), $li.insertBefore($('#filePicker2'));
                        // $li.appendTo( $queue );
                    }
                    // 负责view的销毁
                    function removeFile( file ) {
                        var $li = $('#'+file.id);
                        delete percentages[ file.id ];
                        updateTotalProgress();
                        $li.off().find('.file-panel').off().end().remove();
                    }
                    function resetUploader() {
                        uploadedFiles = [];
                        k = 0;
                    }
                    function updateTotalProgress() {
                        var loaded = 0,
                            total = 0,
                            spans = $progress.children(),
                            percent;
                        $.each( percentages, function( k, v ) {
                            total += v[ 0 ];
                            loaded += v[ 0 ] * v[ 1 ];
                        } );
                        percent = total ? loaded / total : 0;
                        spans.eq( 0 ).text( Math.round( percent * 100 ) + '%' );
                        spans.eq( 1 ).css( 'width', Math.round( percent * 100 ) + '%' );
                        updateStatus();
                    }
                    function updateStatus() {
                        var text = '', stats;
                        if ( state === 'ready' ) {
                            text = '选中' + fileCount + '张图片，共' +
                                WebUploader.formatSize( fileSize ) + '。';
                        } else if ( state === 'confirm' ) {
                            stats = uploader.getStats();
                            if ( stats.uploadFailNum ) {
                                text = '已成功上传' + stats.successNum+ '张图片，'+
                                    stats.uploadFailNum + '张图片上传失败，<a class="retry" href="#">重新上传</a>失败图片或<a class="ignore" href="#">忽略</a>'
                            }

                        } else {
                            stats = uploader.getStats();
                            text = '共' + fileCount + '张（' +
                                WebUploader.formatSize( fileSize )  +
                                '），已上传' + stats.successNum + '张';
                            if ( stats.uploadFailNum ) {
                                text += '，失败' + stats.uploadFailNum + '张';
                            }
                        }
                        $info.html( text );
                    }
                    function setState( val ) {
                        var file, stats;
                        if ( val === state ) {
                            return;
                        }
                        $upload.removeClass( 'state-' + state );
                        $upload.addClass( 'state-' + val );
                        state = val;
                        switch ( state ) {
                            case 'pedding':
                                $placeHolder.removeClass( 'element-invisible' );
                                $queue.parent().removeClass('filled');
                                $queue.hide();
                                $statusBar.addClass( 'element-invisible' );
                                uploader.refresh();
                                $r.hide();
                                break;
                            case 'ready':
                                $placeHolder.addClass( 'element-invisible' );
                                $( '#filePicker2' ).removeClass( 'element-invisible');
                                $queue.parent().addClass('filled');
                                $queue.show();
                                $statusBar.removeClass('element-invisible');
                                uploader.refresh();
                                config.pick.multiple && $r.show();
                                break;
                            case 'uploading':
                                $( '#filePicker2' ).addClass( 'element-invisible' );
                                $progress.show();
                                $upload.text( '暂停上传' );
                                break;
                            case 'paused':
                                $progress.show();
                                $upload.text( '继续上传' );
                                break;
                            case 'confirm':
                                $progress.hide();
                                $upload.text( '开始上传' ).addClass( 'disabled' );
                                stats = uploader.getStats();
                                if ( stats.successNum && !stats.uploadFailNum ) {
                                    setState( 'finish' );
                                    return;
                                }
                                break;
                            case 'finish':
                                stats = uploader.getStats();
                                if ( stats.successNum ) {
                                    if (uploadedFiles.length > 0) {
                                        if (!config.pick.multiple) {
                                            uploadedFiles = uploadedFiles[0];
                                            if (uploadedFiles.state == 'SUCCESS') {
                                                var btn = chooseObject,
                                                    ipt = btn.parent().prev(),
                                                    val = ipt.val(),
                                                    img = ipt.parent().next().children();
                                                if(img.length > 0){
                                                    img.get(0).src = uploadedFiles.url;
                                                }
                                                ipt.val(uploadedFiles.attachment);
                                            } else {
                                                alert(uploadedFiles.msg);
                                            }
                                        } else {
                                            var name = chooseObject.parent().prev().attr('name');
                                            var multierr = false;
                                            $.each(uploadedFiles, function(idx, url) {
                                                if (url.state == 'SUCCESS') {
                                                    chooseObject.parent().parent().next().append('<div class="multi-item"><img src="'+url.url+'" class="img-responsive img-thumbnail cus-img"><input type="hidden" name="'+name+'[]" value="'+url.url+'"><em class="close delMultiImage" title="删除这张图片">×</em></div>');
                                                } else {
                                                    if (!multierr) {
                                                        multierr = true;
                                                        alert(url.msg);
                                                    } else {
                                                        console.log(url.msg);
                                                    }
                                                }
                                            });
                                        }
                                        _modal.modal('hide');

                                        resetUploader();
                                    }
                                } else {
                                    // 没有成功的图片，重设
                                    state = 'done';
                                    location.reload();
                                }
                                break;
                        }
                        updateStatus();
                    }
                    uploader.onUploadProgress = function( file, percentage ) {
                        var $li = $('#'+file.id),
                            $percent = $li.find('.progress span');
                        $percent.css( 'width', percentage * 100 + '%' );
                        percentages[ file.id ][ 1 ] = percentage;
                        updateTotalProgress();
                    };
                    uploader.onFileQueued = function( file ) {
                        fileCount++;
                        fileSize += file.size;
                        if ( fileCount === 1 ) {
                            $placeHolder.addClass( 'element-invisible' );
                            $statusBar.show();
                        }
                        addFile( file );
                        setState( 'ready' );
                        updateTotalProgress();
                    };
                    uploader.onFileDequeued = function( file ) {
                        fileCount--;
                        fileSize -= file.size;
                        if ( !fileCount ) {
                            setState( 'pedding' );
                        }
                        removeFile( file );
                        updateTotalProgress();
                    };
                    uploader.on( 'all', function( type ) {
                        var stats;
                        switch( type ) {
                            case 'uploadFinished':
                                setState( 'confirm' );
                                break;
                            case 'startUpload':
                                setState( 'uploading' );
                                break;
                            case 'stopUpload':
                                setState( 'paused' );
                                break;
                        }
                    });
                    uploader.onError = function( code ) {
                        var msg = code;
                        switch (code) {
                            case 'Q_EXCEED_NUM_LIMIT':
                                msg = '添加的文件数量超出 fileNumLimit 的设置';
                                break;
                            case 'Q_EXCEED_SIZE_LIMIT':
                                msg = '添加的文件总大小超出了 fileSizeLimit 的设置';
                                break;
                            case 'Q_TYPE_DENIED':
                                msg = '添加的文件类型错误';
                                break;
                            case 'P_DUPLICATE':
                                msg = '添加的文件重复了';
                                break;
                        }
                        alert( 'Error: ' + msg );
                    };
                    uploader.onUploadSuccess = function (b, c) {
                        return (k++, uploadedFiles.push(c))
                    }
                    $upload.on('click', function() {
                        if ( $(this).hasClass( 'disabled' ) ) {
                            return false;
                        }
                        if ( state === 'ready' ) {
                            uploader.upload();
                        } else if ( state === 'paused' ) {
                            uploader.upload();
                        } else if ( state === 'uploading' ) {
                            uploader.stop();
                        }
                    });
                    $info.on( 'click', '.retry', function() {
                        uploader.retry();
                    } );
                    $info.on( 'click', '.ignore', function() {
                        alert( 'todo' );
                    } );
                    $upload.addClass( 'state-' + state );
                    updateTotalProgress();

                    $('#filePicker2').mouseenter(function(){
                        uploader.refresh();
                    });;
                }

                function buildModalBody () {
                    return '<ul class="nav nav-tabs"><li class="tab_extend active"><a href="#upload" data-toggle="tab" aria-expanded="false">本地选择</a></li>'+
                        '<li class="tab_extend"><a href="#upload_history" data-toggle="tab" aria-expanded="false">历史图片</a></li>'+
                        '</ul>'+
                        '<div class="tab-content">'+
                        '<div role="tabpanel" class="tab-pane upload active" id="upload">' +
                        '<div id="uploader" class="uploader">' +
                        '<div class="queueList">' +
                        '<div id="dndArea" class="placeholder">' +
                        '<div id="filePicker"></div>' +
                        '<p id="">或将照片拖到这里</p>' +
                        ' </div>' +
                        '</div>' +
                        '<div class="statusBar">' +
                        '<div class="infowrap">' +
                        '<div class="progress" style="display: none;">' +
                        '<span class="text">0%</span>' +
                        '<span class="percentage" style="width: 0%;"></span>' +
                        '</div>' +
                        '<div class="info">共0张（0B），已上传0张</div>' +
                        '<div class="accept"></div>' +
                        '</div>' +
                        '<div class="btns">' +
                        '<div class="uploadBtn btn btn-primary state-pedding" style="margin-top: 4px;">确定使用</div>' +
                        '<div class="modal-button-upload" style="float: right; margin-left: 5px;">' +
                        '<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>'+
                        '<div id="upload_history" style="display:none"><div class="history_images" style="height:350px;overflow-y:scroll">' +
                        '</div>'+
                        '<div class="statusBar"><div class="btns"><div class="uploadBtn btn btn-primary state-pedding" style="margin-top: 4px;">确定使用</div><div class="modal-button-upload" style="float: right; margin-left: 5px;"><button type="button" class="btn btn-default" data-dismiss="modal">取消</button></div></div></div>'+
                        '</div>'+
                        '<div id="upload_internet" style="display:none"></div>'+
                        '</div>';
                }

                function renderModal () {
                    var modal_id = config['modal_id'];
                    if ($('#' + modal_id).length == 0) {
                        return '<div id="' + config['modal_id'] + '" class="fade modal modal-c" role="dialog" tabindex="-1">' +
                            '<div class="modal-dialog cus-size">' +
                            '<div class="modal-content">' +
                            '<div class="modal-header">' +
                            '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
                            '<h4 class="modal-title">上传图片</h4>' +
                            '</div>' +
                            '<div class="modal-body">' +
                            '</div>' +
                            '</div>' +
                            '</div>' +
                            '</div>';
                    } else {
                        return false;
                    }
                }

                // =====================================================================================
                $('.' + config['modal_id']).on('click', function () {
                    chooseObject = $(this);
                    _modal.modal('show');
                    _modal.find('.modal-body').html('');
                    if(config.pick.multiple != undefined && config.pick.multiple != null && config.pick.multiple == true) {
                        _modal.find('.modal-body').html(buildModalBody());
                    }else{
                        _modal.find('.modal-body').html(buildSingleModalBody());
                    }
                });
                $(document).on('click', '.delImage', function () {
                    var _this = $(this);
                    _this.prev().attr("src", config.defaultImage);
                    _this.parent().prev().find("input").val("");
                });
                $(document).on('click', '.delMultiImage', function () {
                    $(this).parent().remove();
                });
                // 解决多modal下滚动以及filePicker失效问题
                $(document).on('hidden.bs.modal', '.modal', function () {
                    if($('.modal:visible').length) {
                        $(document.body).addClass('modal-open');
                    }
                    $('.modal-c').find('.modal-body').html('');
                });

                $(document).on('click', '.tab_extend a', function () {
                    var tab_key = $(this).attr('href');
                    $(tab_key).show();
                    $(tab_key).siblings().hide();
                    if(tab_key == '#upload_history'){
                        $('#upload_history').find('.history_images').html('');
                        usehistoryimages = [];
                        $.ajax({
                            url: config['getHistoryImageUrl'],
                            data: {'nextMarker':''},
                            type: "POST",
                            dataType: 'json',
                            async: false,
                            success: function (result) {
                                $.each( result, function( k, v ) {
                                    var img = $('<img src="'+v+'">');
                                    $('#upload_history').find('.history_images').append(img);
                                } );

                            },
                            error: function (ee) {
                                alert(ee);
                            }
                        });
                    }
                    if(tab_key == '#upload_internet'){
                        alert('还没开发，目前就直接网上下载保存再上传吧先');
                    }
                });
                $(document).on('click', '#upload_history .history_images img', function () {
                    $is_checked = $(this).attr('class');
                    if($is_checked == "checked"){
                        $(this).removeClass('checked');
                        var imagesrc = $(this).attr('src');
                        usehistoryimages=$.grep(usehistoryimages,function(n,i){
                            return n!=imagesrc;
                        });
                    }else{
                        $(this).addClass('checked');
                        usehistoryimages.push($(this).attr('src'));
                    }
                });

                $(document).on('click', '#upload_history .statusBar .btns .uploadBtn', function () {
                    var name = chooseObject.parent().prev().attr('name');
                    if(usehistoryimages.length > 0){
                        $.each(usehistoryimages, function(k, url) {
                            chooseObject.parent().parent().next().append('<div class="multi-item"><img src="'+url+'" class="img-responsive img-thumbnail cus-img"><input type="hidden" name="'+name+'[]" value="'+url+'"><em class="close delMultiImage" title="删除这张图片">×</em></div>');
                        });
                    }
                    _modal.modal('hide');
                    usehistoryimages = [];
                });

                //$("#upload_history .history_images img").toggle(
                //     function() {
                //         $(this).addClass('checked');
                //     },
                //     function() {
                //         $(this).removeClass('checked');
                //     }
                // );
            }



        }else{
            //单图上传
            function imagesAjax(src) {
                var uploadfieldName = (config['uploadFieldName']!=undefined&&config['uploadFieldName']!=null)?config['uploadFieldName']:'file';
                var data = {};
                data[uploadfieldName] = src;//单图上传，和webuploader没关系
                data.postname = uploadfieldName;
                $.ajax({
                    url: config['server'],
                    data: data,
                    type: "POST",
                    dataType: 'json',
                    async: false,
                    success: function (re) {
                        if(re.state == 'SUCCESS'){
                            $('.' + config['modal_id']).parent().prev().val(re.url);
                        }else{
                            alert(re.state);
                        }
                    }
                });
            }
            if(config['screenshot'] == true){
                if(config['platform'] != undefined && config['platform'] == "wechat"){
                    $('body').append(renderWechatSingleModal());
                    //微信端的单图截图上传，微信端的截图和电脑的不能一样啊，格式都不同
                    $('#'+config['option_id']).on('click',function(){
                        alert('click');
                        wx.chooseImage({
                            count: 1, // 默认9
                            sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
                            sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
                            success: function (res) {
                                var localIds = res.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片
                                $.each(localIds,function (k,v) {
                                    wx.getLocalImgData({
                                        localId: v, // 图片的localID
                                        success: function (res) {
                                            var localData = res.localData; // localData是图片的base64数据，可以用img标签显示
                                            modalshowforwechat(localData,v);
                                        }
                                    });
                                })
                            }
                        });
                    });

                    var _modal = $('#' + config['modal_id']);
                    _modal.on("shown.bs.modal", init);
                    function init () {
                        new CropAvatar($('#crop-avatar'));
                    }

                    function modalshowforwechat(localdata,v){
                        _modal.modal('show');
                        _modal.find('.modal-body').html('');
                        _modal.find('.modal-body').html(buildWechatSingleModalBody());
                        var filemaxsize = 1024 * 5;//5M 这个大小需要后台能设置设置
                            var Size = getBase64size(localdata) / 1024; //单位为节
                            if(Size > filemaxsize) {
                                alert('图片过大，请重新选择!');
                                //$(".avatar-wrapper").childre().remove;
                                _modal.modal('hide');
                                return false;
                            }

                        setTimeout(function(){
                            var wechat_img = $('<img src="' + localdata + '">');
                            $("body").find('#' + config['modal_id']).find('.avatar-wrapper').empty().html(wechat_img);
                            wechat_img.cropper({
                                aspectRatio: 1,
                                preview: '.img-preview',
                                strict: false,
                                rotatable: true,
                            });
                        },500);
                        // var wechat_img = $('<img src="' + localdata + '">');
                        // $("body").find('#' + config['modal_id']).find('.avatar-wrapper').empty().html(wechat_img);
                        // wechat_img.cropper({
                        //     aspectRatio: 1,
                        //     preview: '.img-preview',
                        //     strict: false,
                        //     rotatable: true,
                        // });

                         //var filename = document.querySelector("#avatar-name");
                        // var texts = document.querySelector("#avatarInput").value;
                        // var teststr = texts; //你这里的路径写错了
                        // testend = teststr.match(/[^\\]+\.[^\(]+/i); //直接完整文件名的
                        //filename.innerHTML = v;
                    }

                    //获取base64文件大小
                    function getBase64size(base64pic){
                        var str = base64pic.split(",")[1];
                        var equalIndex= str.indexOf('=');
                        if(str.indexOf('=')>0)
                        {
                            str=str.substring(0, equalIndex);
                        }
                        var strLength=str.length;
                        var fileLength=parseInt(strLength-(strLength/8)*2);//单位为字节
                        return fileLength;
                    }

                    function renderWechatSingleModal(){
                        var modal_id = config['modal_id'];
                        if ($('#' + modal_id).length == 0) {
                            return '<div id="' + config['modal_id'] + '" class="fade modal in" aria-hidden="true" aria-labelledby="avatar-modal-label" role="dialog" tabindex="-1">' +
                                '<div class="modal-dialog modal-lg">' +
                                '<div class="modal-content"><form class="avatar-form">' +
                                '<div class="modal-header">' +
                                '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
                                '<h4 class="modal-title">截图上传</h4>' +
                                '</div>' +
                                '<div class="modal-body">' +
                                '</div></form>' +
                                '</div>' +
                                '</div>' +
                                '</div>';
                        } else {
                            return false;
                        }
                    }

                    function buildWechatSingleModalBody(){
                        return  '<div class="avatar-body">'+
                            '<div class="avatar-upload"><input class="avatar-src" id="avatar-src" name="avatar_src" type="hidden">'+
                            '<input class="avatar-data" name="avatar_data" type="hidden">'+
                            '<span id="avatar-name"></span><input class="avatar-input hide" id="avatarInput" name="avatar_file" type="file"></div>'+
                            '<div class="row"><div class="col-md-9"><div class="avatar-wrapper"></div></div><div class="col-md-3"><div class="docs-preview clearfix">'+
                            '</div>'
                            +'</div></div>'+
                            '<div class="row avatar-btns">' +
                            '<div class="btn-group" style="width: 100%;"><button type="button" class="btn btn-info" data-method="rotate" data-option="-45" title="Rotate -45 degrees" style="width: 33.3%;">'+
                            '<span class="docs-tooltip fa fa-undo" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;rotate&quot;, -45)"></span></button>'+
                            '<button type="button" data-method="rotate" data-option="45" title="Rotate 45 degrees" class="btn btn-info" style="width: 33.3%;">'+
                            '<span class="docs-tooltip fa fa-repeat" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;rotate&quot;, 45)"></span></button>'+
                            '<button type="button" class="btn btn-info" data-dismiss="modal" data-method="getCroppedCanvas" style="width: 33.3%;"><span class="docs-tooltip  fa fa-check" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;getCroppedCanvas&quot;)"></span></button></div>'+
                            '</div></div>';
                    }

                }else{
                    /*针对有截图的模块框弹出的情况*/
                    $('body').append(renderSingleModal());
                    var _modal = $('#' + config['modal_id']);

                    _modal.on("shown.bs.modal", init);
                    var $image;
                    var isinit =  false;

                    function init () {
                        new CropAvatar($('#crop-avatar'));
                    }

                    // $(document.body).on('click', '[data-dismiss]', function () {
                    //     alert('delete');
                    //     var data = $(this).data();
                    //     if (data.dismiss === 'modal') {
                    //         $image = $('.avatar-wrapper > img');
                    //         if($image){
                    //             $image.cropper("clear");
                    //         }
                    //     }
                    // });




                    $('.' + config['modal_id']).on('click', function () {
                        chooseObject = $(this);
                        _modal.modal('show');
                        _modal.find('.modal-body').html('');
                        _modal.find('.modal-body').html(buildSingleModalBody());
                        $('#avatarInput').on('change', function(e) {
                            var filemaxsize = 1024 * 5;//5M
                            var target = $(e.target);
                            var Size = target[0].files[0].size / 1024;
                            if(Size > filemaxsize) {
                                alert('图片过大，请重新选择!');
                                $(".avatar-wrapper").childre().remove;
                                return false;
                            }
                            if(!this.files[0].type.match(/image.*/)) {
                                alert('请选择正确的图片!')
                            } else {
                                var filename = document.querySelector("#avatar-name");
                                var texts = document.querySelector("#avatarInput").value;
                                var teststr = texts; //你这里的路径写错了
                                testend = teststr.match(/[^\\]+\.[^\(]+/i); //直接完整文件名的
                                filename.innerHTML = testend;

                            }

                        });

                    });

                    function renderSingleModal(){
                        var modal_id = config['modal_id'];
                        if ($('#' + modal_id).length == 0) {
                            return '<div id="' + config['modal_id'] + '" class="fade modal in" aria-hidden="true" aria-labelledby="avatar-modal-label" role="dialog" tabindex="-1">' +
                                '<div class="modal-dialog modal-lg">' +
                                '<div class="modal-content"><form class="avatar-form">' +
                                '<div class="modal-header">' +
                                '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
                                '<h4 class="modal-title">截图上传</h4>' +
                                '</div>' +
                                '<div class="modal-body">' +
                                '</div></form>' +
                                '</div>' +
                                '</div>' +
                                '</div>';
                        } else {
                            return false;
                        }

                    }

                    function buildSingleModalBody () {
                        return  '<div class="avatar-body">'+
                            '<div class="avatar-upload"><input class="avatar-src" name="avatar_src" id="avatar-src" type="hidden">'+
                            '<input class="avatar-data" name="avatar_data" type="hidden"><label for="avatarInput" style="line-height: 35px;">图片上传</label>'+
                            '<button class="btn btn-primary"  type="button" style="height: 35px;" onClick="$(\'input[id=avatarInput]\').click();">请选择图片</button>'+
                            '<span id="avatar-name"></span><input class="avatar-input hide" id="avatarInput" name="avatar_file" type="file"></div>'+
                            '<div class="row"><div class="col-md-9"><div class="avatar-wrapper"></div></div><div class="col-md-3"><div class="docs-preview clearfix"><div class="img-preview preview-lg" id="imageHead"></div><div class="img-preview preview-md"></div>'+
                            '<div class="img-preview preview-sm"></div></div>'
                            +'</div></div>'+
                            '<div class="row avatar-btns"><div class="col-md-4"><div class="btn-group"><button class="btn btn-primary fa fa-undo" data-method="rotate" data-option="-45" type="button" title="Rotate -45 degrees"><span class="docs-tooltip" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;rotate&quot;, -45)"> 向左旋转</span></button> </div>'+
                            '<div class="btn-group"><button class="btn  btn-primary fa fa-repeat" data-method="rotate" data-option="45" type="button" title="Rotate 45 degrees"><span class="docs-tooltip" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;rotate&quot;, 45)">向右旋转</span></button></div></div>'+
                            '<div class="col-md-5" style="text-align: right;"><button class="btn btn-primary fa fa-arrows" data-method="setDragMode" data-option="move" type="button" title="移动">'+
                            '<span class="docs-tooltip" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;setDragMode&quot;, &quot;move&quot;)"></span></button>'+
                            '<button type="button" class="btn btn-primary fa fa-search-plus" data-method="zoom" data-option="0.1" title="放大图片"><span class="docs-tooltip" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;zoom&quot;, 0.1)">'+
                            '</span></button><button type="button" class="btn btn-primary fa fa-search-minus" data-method="zoom" data-option="-0.1" title="缩小图片"><span class="docs-tooltip" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;zoom&quot;, -0.1)">'+
                            '</span></button><button type="button" class="btn btn-primary fa fa-refresh" data-method="reset" title="重置图片">'+
                            '<span class="docs-tooltip" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;reset&quot;)" aria-describedby="tooltip866214"></button></div><div class="col-md-3"> <button data-method="getCroppedCanvas" class="btn btn-primary btn-block avatar-save fa fa-save" type="button" data-dismiss="modal"><span class="docs-tooltip" data-toggle="tooltip" title="" data-original-title="$().cropper(&quot;getCroppedCanvas&quot;)">保存修改</span></button> </div>'+
                            '</div></div>';
                    }


                }


                $(document.body).on('click', '[data-method]', function () {
                    var data = $(this).data(),
                        $target,
                        result;

                    if (data.method) {
                        data = $.extend({}, data); // Clone a new one

                        if (typeof data.target !== 'undefined') {
                            $target = $(data.target);

                            if (typeof data.option === 'undefined') {
                                try {
                                    data.option = JSON.parse($target.val());
                                } catch (e) {
                                    console.log(e.message);
                                }
                            }
                        }
                        $image = $('.avatar-wrapper > img');
                        result = $image.cropper(data.method, data.option);
                        if (data.method === 'getCroppedCanvas') {//我已经看不懂代码了………………
                            var base64 = result.toDataURL('image/jpeg');
                            $('.'+config['modal_id']).attr("src",base64);
                            imagesAjax(base64);
                        }

                        if(data.method === "")

                            if ($.isPlainObject(result) && $target) {
                                try {
                                    $target.val(JSON.stringify(result));
                                } catch (e) {
                                    console.log(e.message);
                                }
                            }

                    }
                });

                function CropAvatar($element) {
                    this.$container = $element;

                    this.$avatarView = this.$container.find('.avatar-view');
                    this.$avatar = this.$avatarView.find('img');
                    this.$avatarModal = $("body").find('#' + config['modal_id']);
                    this.$loading = $("#page-wrapper").find('.loading');
                    this.$avatarForm = this.$avatarModal.find('.avatar-form');
                    this.$avatarUpload = this.$avatarForm.find('.avatar-upload');
                    this.$avatarSrc = this.$avatarForm.find('.avatar-src');
                    this.$avatarData = this.$avatarForm.find('.avatar-data');
                    this.$avatarInput = this.$avatarForm.find('.avatar-input');
                    this.$avatarSave = this.$avatarForm.find('.avatar-save');
                    this.$avatarBtns = this.$avatarForm.find('.avatar-btns');

                    this.$avatarWrapper = this.$avatarModal.find('.avatar-wrapper');
                    this.$avatarPreview = this.$avatarModal.find('.avatar-preview');

                    this.init();
                }

                CropAvatar.prototype = {
                    constructor: CropAvatar,
                    support: {
                        fileList: !!$('<input type="file">').prop('files'),
                        blobURLs: !!window.URL && URL.createObjectURL,
                        formData: !!window.FormData
                    },

                    init: function() {
                        this.support.datauri = this.support.fileList && this.support.blobURLs;

                        if(!this.support.formData) {
                            this.initIframe();
                        }

                        this.initTooltip();
                        this.initModal();
                        this.addListener();
                    },

                    addListener: function() {
                        this.$avatarView.on('click', $.proxy(this.click, this));
                        this.$avatarInput.on('change', $.proxy(this.change, this));
                        this.$avatarForm.on('submit', $.proxy(this.submit, this));
                        this.$avatarSrc.on('change',$.proxy(this.srcchange,this));
                        //this.$avatarBtns.on('click', $.proxy(this.rotate, this));
                    },

                    initTooltip: function() {
                        this.$avatarView.tooltip({
                            placement: 'bottom'
                        });
                    },

                    initModal: function() {
                        this.$avatarModal.modal({
                            show: false
                        });
                    },

                    initPreview: function() {
                        var url = this.$avatar.attr('src');

//			this.$avatarPreview.empty().html('<img src="' + url + '">');
                    },

                    initIframe: function() {
                        var target = 'upload-iframe-' + (new Date()).getTime(),
                            $iframe = $('<iframe>').attr({
                                name: target,
                                src: ''
                            }),
                            _this = this;

                        // Ready ifrmae
                        $iframe.one('load', function() {

                            // respond response
                            $iframe.on('load', function() {
                                var data;

                                try {
                                    data = $(this).contents().find('body').text();
                                } catch(e) {
                                    console.log(e.message);
                                }

                                if(data) {
                                    try {
                                        data = $.parseJSON(data);
                                    } catch(e) {
                                        console.log(e.message);
                                    }

                                    _this.submitDone(data);
                                } else {
                                    _this.submitFail('Image upload failed!');
                                }

                                _this.submitEnd();

                            });
                        });

                        this.$iframe = $iframe;
                        this.$avatarForm.attr('target', target).after($iframe.hide());
                    },

                    click: function() {
                        this.$avatarModal.modal('show');
                        this.initPreview();
                    },

                    srcchange: function() {//乱写啊
                        alert('gaoshiqing');
                        var src = this.$avatarSrc.val();alert(src);
                        typeof src === 'string' ? src : URL.createObjectURL(src);
                        this.url = src;
                        this.startCropper();
                    },

                    change: function(){
                        var files,
                            file;
                        if(this.support.datauri) {
                            files = this.$avatarInput.prop('files');

                            if(files.length > 0) {
                                file = files[0];

                                if(this.isImageFile(file)) {
                                    if(this.url) {
                                        URL.revokeObjectURL(this.url); // Revoke the old one
                                    }

                                    this.url = URL.createObjectURL(file);
                                    this.startCropper();
                                }
                            }
                        } else {
                            file = this.$avatarInput.val();

                            if(this.isImageFile(file)) {
                                this.syncUpload();
                            }
                        }
                    },

                    submit: function() {
                        if(!this.$avatarSrc.val() && !this.$avatarInput.val()) {
                            return false;
                        }

                        if(this.support.formData) {
                            //this.ajaxUpload();
                            return false;
                        }
                    },

                    rotate: function(e) {
                        var data;

                        if(this.active) {
                            data = $(e.target).data();

                            if(data.method) {
                                this.$img.cropper(data.method, data.option);
                            }
                        }
                    },

                    isImageFile: function(file) {
                        if(file.type) {
                            return /^image\/\w+$/.test(file.type);
                        } else {
                            return /\.(jpg|jpeg|png|gif)$/.test(file);
                        }
                    },

                    startCropper: function() {
                        var _this = this;

                        if(this.active) {
                            this.$img.cropper('replace', this.url);
                        } else {
                            this.$img = $('<img src="' + this.url + '">');
                            this.$avatarWrapper.empty().html(this.$img);
                            this.$img.cropper({
                                aspectRatio: 1,
                                preview: '.img-preview',
                                strict: false,
                                rotatable: true,
                            });
                            this.active = true;
                        }
                    },

                    stopCropper: function() {
                        if(this.active) {
                            this.$img.cropper('destroy');
                            this.$img.remove();
                            this.active = false;
                        }
                    },


                    syncUpload: function() {
                        this.$avatarSave.click();
                    },

                    submitStart: function() {
                        this.$loading.fadeIn();
                    },
                    submitFail: function(msg) {
                        this.alert(msg);
                    },

                    submitEnd: function() {
                        this.$loading.fadeOut();
                    },

                    cropDone: function() {
                        this.$avatarForm.get(0).reset();
                        this.$avatar.attr('src', this.url);
                        this.stopCropper();
                        this.$avatarModal.modal('hide');
                    },

                    alert: function(msg) {
                        var $alert = [
                            '<div class="alert alert-danger avater-alert">',
                            '<button type="button" class="close" data-dismiss="alert">&times;</button>',
                            msg,
                            '</div>'
                        ].join('');

                        this.$avatarUpload.after($alert);
                    }
                };


            }else{

                if(config['platform'] != undefined && config['platform'] == "wechat") {
                    //微信端的单图截图上传，微信端的截图和电脑的不能一样啊，格式都不同
                    $('#' + config['option_id']).on('click', function () {
                        alert('click');
                        wx.chooseImage({
                            count: 1, // 默认9
                            sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
                            sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
                            success: function (res) {
                                var localIds = res.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片
                                $.each(localIds, function (k, v) {
                                    wx.getLocalImgData({
                                        localId: v, // 图片的localID
                                        success: function (res) {
                                            var localData = res.localData; // localData是图片的base64数据，可以用img标签显示
                                            $('.'+config['modal_id']).attr("src",localData);
                                            imagesAjax(localData);
                                        }
                                    });
                                })
                            }
                        });
                    });
                }else{
                    //如果是不需要截图的单图上传
                    var uploadfiledName = (config['uploadFieldName']!=undefined&&config['uploadFieldName']!=null)?config['uploadFieldName']:'file';
                    var uploader = WebUploader.create({
                        auto: true,
                        pick: {
                            id: '#'+config['option_id'],//"#webupload_{$this->options['id']}",
                        },
                        fileVal: uploadfiledName,
                        formData: {
                            'uploadFieldName': uploadfiledName,
                        },
                        server: config['server'],
                        accept: {
                            title:'Images',
                            extensions:config.accept.extensions,
                            mimeTypes: config.accept.mimeTypes,
                        },
                        resize: false,

                    });

                    uploader.on( 'fileQueued', function( file ) {
                        var img = $('.'+config['modal_id']);
                        uploader.makeThumb( file, function( error, src ) {
                            if ( error ) {
                                img.replaceWith('<span>不能预览</span>');
                                return;
                            }
                            img.attr( 'src', src );
                        });
                    });
                }

            }

        }

    };


});
