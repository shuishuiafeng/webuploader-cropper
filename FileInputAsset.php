<?php

namespace doumiaoduo;

use yii\web\AssetBundle;

class FileInputAsset extends AssetBundle
{
    public $css = [
    	'webuploader/style.css',
        'webuploader/webuploader.css',
        'css/style.css',
        'css/cropper.css',
        'css/font-awesome.min.css'
    ];
    public $js = [
        'webuploader/webuploader.min.js',
        'webuploader/init.js',
        'webuploader/cropper.js',
        'webuploader/html2canvas.min.js',
        'webuploader/jweixin-1.2.0.js'
    ];
    public $depends = [
        'yii\bootstrap\BootstrapPluginAsset',
    ];

    /**
     * @inheritdoc
     */
    public function init()
    {
        $this->sourcePath = __DIR__;
        parent::init();
    }
}
