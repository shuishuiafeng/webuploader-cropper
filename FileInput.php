<?php

namespace dmdedu;

use EasyWeChat\Factory;
use Yii;
use yii\widgets\InputWidget;
use yii\helpers\Html;
use yii\base\InvalidConfigException;
use yii\helpers\Url;
use yii\helpers\Json;

class FileInput extends InputWidget
{
    public $clientOptions = [];
    public $chooseButtonClass = ['class' => 'btn-default'];
    private $_view;
    private $_hashVar;
    private $_encOptions;
    private $_config;
    public $issingle;
    private $_screenshot = false;

    public function init ()
    {
        parent::init();
        $this->_view = $this->getView();
        $this->initOptions();
        $this->initConfig();
        $this->registerClientScript();
    }

    public function run ()
    {
        if ($this->hasModel()) {
            $model = $this->model;
            $attribute = $this->attribute;

            // 单图
            if (empty($this->_config['pick']['multiple'])) {
                $html = $this->renderSingleinput($model, $attribute);
                
                //$html = $this->renderInput($model, $attribute);
               // $html .= $this->renderImage($model, $attribute);
            } 
            // 多图
            else {
                $html = $this->renderMultiInput($model, $attribute);
                $html .= $this->renderMultiImage($model, $attribute);
            }
            
            echo $html;
        }
    }

    /**
     * init options
     */
    public function initOptions ()
    {
        // to do.
        $id = md5($this->options['id']);
        $this->hashClientOptions("webupload_config_{$id}");
    }

    /**
     * register base js config
     */
    public function initConfig ()
    {
        if (empty(Yii::$app->params['domain'])) {
            throw new InvalidConfigException("param `domain` must set.", 1);
        }
        $this->_config = $this->mergeConfig();
        $config = Json::htmlEncode($this->_config);
        $src = Yii::$app->params['webuploader']['baseConfig']['defaultImage'];
        if (empty($this->_config['pick']['multiple'])) {
            $this->issingle = 1;
        }
        if(isset($this->_config['platform']) && $this->_config['platform'] == 'wechat' && isset(\Yii::$app->params['wechat_options'])&&!empty(\Yii::$app->params['wechat_options'])){
            $wechat_options = \Yii::$app->params['wechat_options'];
            $config_wechat = [
                'debug' => $wechat_options['debug'],
                'app_id' => $wechat_options['app_id'],
                'secret' => $wechat_options['secret'],
                'response_type' => 'array',
                'log' => $wechat_options['log']
            ];
            $app = Factory::officialAccount($config_wechat);
            $config_str = $app->jssdk->buildConfig(array('chooseImage','uploadImage'),$wechat_options['debug']);
            $jssdk_js = <<<JS
            jQuery(document).ready(function () {
                wx.config({$config_str});
                
            });
            
JS;
            $this->_view->registerJs($jssdk_js);
        }
        $this->_config['platform'] = isset($this->_config['platform'])?$this->_config['platform']:'';
        $js = <<<JS
        jQuery(document).ready(function () {
            var {$this->_hashVar} = {$config};
            $('#{$this->_hashVar}').webupload_fileinput({$this->_hashVar});
            
            if('{$this->issingle}' == 1){
                if(typeof('{$this->_config['platform']}') != 'undefined' && '{$this->_config['platform']}' == "wechat"){
                    //如果是微信平台就啥也不要做
                }else{
                    $('.img-responsive').parents('.input-group').on( 'mouseenter', function() {
                    $(this).find('.file-img').stop().animate({height: 30});
                    });
                    $('.img-responsive').parents('.input-group').on( 'mouseleave', function() {
                        $(this).find('.file-img').stop().animate({height: 0});
                    });
                    $('.file-img').children('.cancel').on('click', function() {
                        $('.{$this->_hashVar}').attr('src','{$src}');
                    });
                }
                
            }
        });
JS;
        $this->_view->registerJs($js);
    }

    /**
     * Registers the needed client script and options.
     */
    public function registerClientScript ()
    {
        FileInputAsset::register($this->_view);

    }

    /**
     * generate hash var by plugin options
     */
    protected function hashClientOptions($name)
    {
        $this->_encOptions = empty($this->clientOptions) ? '' : Json::htmlEncode($this->clientOptions);
        $this->_hashVar = $name . '_' . hash('crc32', $this->_encOptions);
    }

    public function mergeConfig ()
    {
        // $config = $this->mergeArray($this->getDefaultClientOptions(), $this->clientOptions);
        $config = array_merge($this->getDefaultClientOptions(), $this->clientOptions);
        if (isset($this->clientOptions['csrf']) && $this->clientOptions['csrf'] === false) {
        } else {
            $config['formData'][Yii::$app->request->csrfParam] = Yii::$app->request->csrfToken;
        }

        $config['modal_id'] = $this->_hashVar;

        if (empty($config['server'])) {
            $uploadUrl = Yii::$app->params['webuploader']['uploadUrl'];
            $config['server'] = Url::to([$uploadUrl]);
        }

        if(isset($this->clientOptions['screenshot'])){
            $this->_screenshot = $config['screenshot'];
            $config['screenshot'] = $config['screenshot'];
        }
        $config['option_id'] = "webupload_".$this->options['id'];


        return $config;
    }

    /**
     * array merge
     */
    public function mergeArray ($oriArr, $desArr)
    {
        foreach ($oriArr as $k => $v) {
            if (array_key_exists($k, $desArr)) {
                if (is_array($v) && $v) {
                    foreach ($v as $k2 => $v2) {
                        if (array_key_exists($k2, $desArr[$k])) {
                            $oriArr[$k][$k2] = $desArr[$k][$k2];
                        }
                    }
                } else {
                    $oriArr[$k] = $desArr[$k];
                }
            }
        }
        return $oriArr;
    }

    /**
     * register default config for js
     */
    public function getDefaultClientOptions ()
    {
        return Yii::$app->params['webuploader']['baseConfig'];
    }

    /**
     * render html body-input
     */
    public function renderInput ($model, $attribute)
    {
        Html::addCssClass($this->chooseButtonClass, "btn {$this->_hashVar}");
        $eles = [];
        $eles[] = Html::activeTextInput($model, $attribute, ['class' => 'form-control']);
        $eles[] = Html::tag('span', Html::button('选择图片', $this->chooseButtonClass), ['class' => 'input-group-btn']);

        return Html::tag('div', implode("\n", $eles), ['class' => 'input-group']);
    }

    /*
     * 单图显示html
     */
    public function renderSingleinput($model,$attribute){
        Html::addCssClass($this->chooseButtonClass, "btn {$this->_hashVar}");
        if ($this->hasModel()) {
            $model = $this->model;
            $attribute = $this->attribute;
            $src = Yii::$app->params['webuploader']['baseConfig']['defaultImage'];
            $eles = [];
            if (($value = $model->$attribute)) {
                $src = $this->_validateUrl($value) ? $value : Yii::$app->params['domain'] . $value;
            }
            $eles[] = Html::activeHiddenInput($this->model, $this->attribute, ['class' => 'form-control']);
            $eles[] = '<div id="webupload_' . $this->options['id'] . '" style="text-align:center;">';
            $eles[] = Html::img($src, ['class' => "img-responsive img-thumbnail cus-img btn-default btn {$this->_hashVar}"]);
            $span = Html::tag('span','删除',['class'=>'cancel']);
            $eles[] = Html::tag('div',$span,['class'=>'file-img','style'=>"height:0px;"]);
            $eles[] = '</div>';
            //$eles[] = Html::tag('i', '', ['class' => 'close delImage fa fa-close', 'title' => '删除这张图片']);
            return Html::tag('div', implode("\n", $eles), ['class' => 'input-group']);
        }
    }


    /**
     * render html body-input-multi
     */
    public function renderMultiInput ($model, $attribute)
    {
        if ($this->hasModel()) {
            Html::addCssClass($this->chooseButtonClass, "btn {$this->_hashVar}");
            $eles = [];
            $eles[] = Html::activeHiddenInput($model,$this->attribute, $this->options);
            $eles[] = Html::tag('span', Html::button('选择图片', $this->chooseButtonClass), ['class' => 'input-group-btn']);

            return Html::tag('div', implode("\n", $eles), ['class' => 'input-group']);
        }else{
            $eles = [];
            $eles[] = Html::hiddenInput($this->name, $this->value, $this->options);
            $eles[] = Html::tag('span', Html::button('选择图片', $this->chooseButtonClass), ['class' => 'input-group-btn']);

            return Html::tag('div', implode("\n", $eles), ['class' => 'input-group']);
        }

    }

    /**
     * render html body-image
     */
    public function renderImage ($model, $attribute)
    {
        $src = Yii::$app->params['webuploader']['baseConfig']['defaultImage'];
        $eles = [];
        if (($value = $model->$attribute)) {
            $src = $this->_validateUrl($value) ? $value : Yii::$app->params['domain'] . $value;
        }
        $eles[] = Html::img($src, ['class' => 'img-responsive img-thumbnail cus-img']);
        $eles[] = Html::tag('em', 'x', ['class' => 'close delImage', 'title' => '删除这张图片']);

        return Html::tag('div', implode("\n", $eles), ['class' => 'input-group', 'style' => 'margin-top:.5em;']);
    }

    /**
     * render html body-image-muitl
     */
    public function renderMultiImage ($model, $attribute)
    {
        /**
         * @var $srcTmp like this: src1,src2...srcxxx
         */
        $srcTmp = $model->$attribute;
        $items = [];
        if ($srcTmp) {
            is_string($srcTmp) && $srcTmp = explode(Yii::$app->params['webuploader']['delimiter'], $srcTmp);
            $inputName = Html::getInputName($model, $attribute);
            foreach ($srcTmp as $k => $v) {
                $dv = $this->_validateUrl($v) ? $v : Yii::$app->params['domain'] . $v;
                $src = $v ? $dv : Yii::$app->params['webuploader']['baseConfig']['defaultImage'];
                $eles = [];
                $eles[] = Html::img($src, ['class' => 'img-responsive img-thumbnail cus-img']);
                $eles[] = Html::hiddenInput($inputName . "[]", $v);
                $eles[] = Html::tag('em', 'x', ['class' => 'close delMultiImage', 'title' => '删除这张图片']);
                $items[] = Html::tag('div', implode("\n", $eles), ['class' => 'multi-item']);
            }
        } 

        return Html::tag('div', implode("\n", $items), ['class' => 'input-group multi-img-details']);
    }

    /**
     * validate `$value` is url
     */
    private function _validateUrl ($value)
    {
        $pattern = '/^{schemes}:\/\/(([A-Z0-9][A-Z0-9_-]*)(\.[A-Z0-9][A-Z0-9_-]*)+)(?::\d{1,5})?(?:$|[?\/#])/i';
        $validSchemes = ['http', 'https'];
        $pattern = str_replace('{schemes}', '(' . implode('|', $validSchemes) . ')', $pattern);
        if (!preg_match($pattern, $value)) {
            return false;
        }
        return true;
    }
}
