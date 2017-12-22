# webuploader-cropper
此扩展集成webuploader图片上传插件webuploader.js和cropper.js实现的截图和多图上传，在bailangzhan/yii2-webuploader的基础上修改

## 安装


推荐使用composer进行安装

```
$ composer require shuishuiafeng/webuploader-cropper
```

## 使用
params.php或者params-local.php内增加webuploader和domain配置项
```php
// 图片服务器的域名设置，拼接保存在数据库中的相对地址，可通过web进行展示
```php
'domain' => 'http://blog.m/',//目前用了阿里云所以这个域名暂时没用
'webuploader' => [
	// 后端处理图片的地址，value 是相对的地址，是全局的处理图片地址，也可以在图片上传的前端小部件FileInput调用时候中覆盖掉，因为不同的图片上传调用的后台处理地址可能不同
	'uploadUrl' => 'blog/upload',
	// 多文件分隔符
	'delimiter' => ',',
	// 基本配置
	'baseConfig' => [
		'defaultImage' => 'http://img1.imgtn.bdimg.com/it/u=2056478505,162569476&fm=26&gp=0.jpg',//项目文件web路径/img/default-img.jpg
		'disableGlobalDnd' => true,//禁用掉浏览器拖拽打开新文件页面的功能
		'accept' => [
			'title' => 'Images',
			'extensions' => 'gif,jpg,jpeg,bmp,png',
			'mimeTypes' => 'image/*',
		],
		'pick' => [
			'multiple' => false,
		],
	],
],
```

###区分ActiveForm和非ActiveForm的基础使用
```php
<?php 
// ActiveForm
echo $form->field($model, 'file')->widget('dmdedu\FileInput', [
]); 

// 非 ActiveForm
echo '<label class="control-label">图片</label>';
echo \dmdedu\FileInput::widget([
    'model' => $model,
    'attribute' => 'file',
]);
?>
```

###单图无截图上传小部件
```php
//距离在formbuilder中的form中使用
'image'=>[
    'type'=>'widget',
    'class'=>\dmdedu\FileInput::className(),
    'clientOptions'=>[
         'accept' => [
             'extensions' => 'gif,jpg,jpeg,bmp,png',
             'mimeTypes' => 'image/gif,image/jpg,image/jpeg,image/bmp,image/png'
         ],
         'pick' => [//多图模式默认关闭
             'class' => 'btn-default',
             'innerHTML' => '图'
         ],
         /*非截图的设置如下*/
          'screenshot' => false,//如果是截图就是base64流，不是截图就是普通文件上传
          'server' => \yii\helpers\Url::to('/dmdfile/upload/image'),
          'uploadFieldName' => 'upfile'
         /*---end 非截图---*/
         
         /*微信端单图非截图上传*/
         'server' => \yii\helpers\Url::to('/dmdfile/upload/imagewechat'),//微信图片的传入的内容都是base64的，如果重写上传功能请按base64来获取内容并存储       
        'platform' => 'wechat',//必须的，微信端必须要有要不然完蛋了
         'fileNumLimit' => 1//设置多图上传时候的最大上传文件数目，不用设置默认就是1
         /*---end---*/
    ],
],
```

###单图截图上传
除了下面指出的部分，其他和上面的配置一致；
```php
/* 截图的设置如下：*/
'screenshot' => true,
'server' => \yii\helpers\Url::to('/dmdfile/upload/imagestream'),
/*微信端截图*/
'screenshot' => true,//微信端也是可以截图的
'server' => \yii\helpers\Url::to('/dmdfile/upload/imagewechat'),//保持
'platform' => 'wechat',//微信端必须要有要不然完蛋了
'fileNumLimit' => 1
```

###多图上传
多图上传不会有截图功能，所以不用考虑，只需要区分是电脑端上传还是微信端上传即可，使用示例如下
```php
'imageList' => [
     'type' => 'widget',
     'class'=>\dmdedu\FileInput::className(),
     'clientOptions'=>[
     'accept' => [
          'extensions' => 'gif,jpg,jpeg,bmp,png',
          'mimeTypes' => 'image/gif,image/jpg,image/jpeg,image/bmp,image/png'//不要用image/* 会造成打开选择文件很卡
     ],
     'pick' => [
          'multiple' => true,//将多图模式打开
     ],
     /*正常电脑端上传多图*/
     'server' => \yii\helpers\Url::to('/dmdfile/upload/image'),//文件上传服务器处理的路径
     'uploadFieldName' => 'upfile'//在前端存放文件的字段名
     /*----end:电脑端多图上传----*/
     /*微信端多图上传*/
     'server' => \yii\helpers\Url::to('/dmdfile/upload/imagewechat'),//保持
     'platform' => 'wechat',//微信端必须要有要不然完蛋了
     'fileNumLimit' => 6//设置多图上传时候的最大上传文件数目，可选区间1-9的整数
     /*---end: 微信端多图上传----*/
     ],
]
```

控制器
进行上传文件操作的controller的地址可以在params.php或者params-local.php中配置 `Yii::$app->params['webuploader']['uploadUrl']`, 也可以在 FileInput的clientOptions中配置 `server` 项。控制器需要返回的数据格式如下
```php
// 错误时
{"code": 1, "msg": "error"}

// 正确时， 其中 attachment 指的是保存在数据库中的路径，url 是该图片在web可访问的地址。。。。这里还没修整
{"code": 0, "url": "http://domain/图片地址", "attachment": "图片地址"}
```

## 注意
如果是修改的多图片操作，务必保证 $model->file = 'src1,src2,src3,...'; 或者 $model->file = ['src1', 'src2'. 'src3', ...];

