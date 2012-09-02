$(function(){
    var sanitize = new Sanitize({
        elements : [
            'a','b','blockquote','br','cite','dd','div','dl','dt','em','i','img','li','ol','q','small','strike','strong','sub','sup','u','ul'
        ]
        ,attributes:{
            a : ['href'],
            img : ['src']
        }
        ,add_attributes:{
            a : { 'target' : '_blank' }
        }
        ,protocols:{
            a : { href : ['http', 'https', 'mailto'] }
        }
    });

    var COLLAPSED_HEIGHT = 32;
    var Note = Backbone.Model.extend({
        defaults:{
            position:{top:20,left:30}
            ,scale:{width:300,height:300}
            ,theme:'0'
            ,fonttheme:'1'
            ,customfont:'16'
            ,title:'Note'
            ,content:''
            ,collapsed:''
            ,locked:false
            ,contentHeight:248
            ,ref:{title:'',href:''}
        }

        ,initialize:function(){
            this.bind('change',function(){
                this.save()
            });
        }
        ,remove:function(){
            this.destroy();
        }
    });

    var NoteCollection = Backbone.Collection.extend({
        model:Note
        ,localStorage:new Backbone.LocalStorage('notty-note')
    });

    var Notes = new NoteCollection();

    var NoteView = Backbone.View.extend({
        tagName:'div'
        ,className:'note'
        ,template:function(tmpl,obj){
            var template = $(tmpl).html();
            $.each(obj,function(index,item){
                var reg = new RegExp('\\{\\{\\='+index+'\\}\\}')
                if(index == 'title'){
                    template = template.replace(reg,_.escape(item));
                }else{
                    template = template.replace(reg,item);
                }
            });

            return template;
        }
        ,initialize:function(){
            this.bringNoteToFront($(this.el));
            var that = this;
            var $ele = $(this.el);
            var model = this.model;

            model.bind('change:title',function(){
                $ele.find('.note-nav-title').text(model.get('title'));
            });
            model.bind('change:theme',function(){
                $ele.removeClass('note-theme0 note-theme1 note-theme2 note-theme3 note-theme4 note-theme5 note-theme6 note-theme7');
                $ele.addClass('note-theme'+model.get('theme'));
            });
            model.bind('change:fonttheme',function(){
                $ele.find('.note-content').removeClass('font-theme0 font-theme1 font-theme2 font-theme3');
                $ele.find('.note-content').addClass('font-theme'+model.get('fonttheme'));
                if(model.get('fonttheme') == '4'){
                    var fontsize = model.get('customfont');
                    $ele.find('.note-content').css({'font-size':fontsize+'px'});
                }else{
                    $ele.find('.note-content').css({'font-size':''});
                }
            });
            model.bind('change:customfont',function(){
                $ele.find('.note-content').removeClass('font-theme0 font-theme1 font-theme2 font-theme3');
                $ele.find('.note-content').addClass('font-theme'+model.get('fonttheme'));
                if(model.get('fonttheme') == '4'){
                    var fontsize = model.get('customfont');
                    $ele.find('.note-content').css({'font-size':fontsize+'px'});
                }else{
                    $ele.find('.note-content').css({'font-size':''});
                }
            })

            $ele.html(
                this.template('#note-template',model.toJSON())
            ).draggable({
                handle:'.note-nav'
                ,stack:'.note'
                ,stop:function(){
                    var $el = $(this);
                    that.bringNoteToContainer(that);
                }
            }).css({
                position:'absolute'
                ,top:model.get('position').top
                ,left:model.get('position').left
                ,width:model.get('scale').width
                ,height:model.get('scale').height
            }).resizable({
                minWidth:200
                ,minHeight:200
                ,handles:'e,w,s,se'
                ,alsoResize:$ele.find('.note-content')
                ,stop:function(){that.changeScaleAndContentHeight(that)}
            });

            var va = sanitize.clean_node($ele.find('.note-content')[0]);
            $ele.find('.note-content').html(va)

            $ele.find('.note-content').height(model.get('contentHeight'));

            if(model.get('collapsed')){
                $ele.addClass('content-collapse');
                $ele.height(COLLAPSED_HEIGHT);
            }

            var theme = model.get('theme');
            if(theme){
                $ele.addClass('note-theme'+theme)
            }

            var fontTheme = model.get('fonttheme');
            $ele.find('.note-content').addClass('font-theme'+fontTheme);
            if(fontTheme == '4'){
                $ele.find('.note-content').css({"font-size":model.get('customfont')+'px'});
            }

            var locked = model.get('locked');
            if(locked){
                $ele.addClass('locked')
            }
        }
        ,render:function(){
            return this;
        }
        ,events:{
            'mousedown':'clickNote'
            ,'dblclick .note-nav':'foldContent'
            ,'click .note-nav-close':'deleteNote'
            ,'click .note-nav-lock':'lockNote'
            ,'click .note-nav-title':'settings'
            ,'keyup .note-content':'contentChange'
            ,'blur .note-content':'contentChange'
        }
        ,foldContent:function(e){
            var $ele = $(this.el);
            var target = $ele.find('.note-nav')[0];

            if(e.target == target){
                if(this.model.get('collapsed')){
                    var height = $ele.attr('data-height') || this.model.get('scale').height;
                    $ele.attr('data-height','');

                    $ele.removeClass('content-collapse')
                    $ele.animate({height:height},'fast')

                    this.model.set({collapsed:''});
                }else{
                    $ele.attr('data-height',$ele.height())
                    $ele.animate({height:COLLAPSED_HEIGHT},'fast',function(){
                        $ele.addClass('content-collapse')
                    })

                    this.model.set({collapsed:'content-collapse'});
                }
            }
        }
        ,clickNote:function(e){
            var $target = $(this.el)
            this.bringNoteToFront($target);
        }
        ,deleteNote:function(e){
            var $target = $(e.target);
            var top = $target.offset().top;
            var left = $target.offset().left;
            var that = this;
            var locked = that.model.get('locked');
            var $view = $(that.el);
            var del= function(){
                $view.addClass('animated fadeOut');
                setTimeout(function(){
                    $view.remove();
                    that.model.remove();
                },600);
            };

            if(!locked){
                if(!$.trim(that.model.get('content'))){
                    del()
                    return true;
                }

                $('#tmpl-close')
                    .css({
                        top:top-20
                        ,left:left-200
                    })
                    .unbind()
                    .fadeIn('fast')
                    .delegate('#btn-close-cancel','click',function(){
                        $('#tmpl-close').unbind().fadeOut('fast');
                    })
                    .delegate('#btn-close-confirm','click',function(){
                        $('#tmpl-close').unbind().hide();
                        del();
                    })
                    .delegate('#tmpl-close-txt','keydown',function(e){
                        if(e.keyCode == 13){
                            $('#btn-close-confirm').trigger('click')
                        }else if(e.keyCode == 27){
                            $('#btn-close-cancel').trigger('click')
                        }
                    })
            }

            $('#tmpl-close-txt').focus();
        }
        ,lockNote:function(e){
            var locked = this.model.get('locked');
            var $ele = $(this.el);

            if(locked){
                this.model.set({locked:false});
                $ele.removeClass('locked');
            }else{
                this.model.set({locked:true});
                $ele.addClass('locked');
            }
        }
        ,settings:function(){
            if(!this.model.get('locked') && !this.model.get('collapsed')){
                var that = this;
                var title = this.model.get('title');
                var $setting = $('#modal-settings');
                $('#modal-title').val(title);
                $setting.modal({height:800}).modal('show')
                    .on('shown',function(){
                        $('#modal-title').select();
                        var themeid = that.model.get('theme');
                        var fontTheme = that.model.get('fonttheme');
                        $setting.attr({
                            'data-themeid':themeid
                            ,'data-title':that.model.get('title')
                            ,'data-fonttheme':fontTheme
                        });
                        $setting.find('.note-theme'+themeid).addClass('modal-theme-selected');
                        $setting.find('.font-theme'+fontTheme).addClass('font-theme-selected');
                        if(fontTheme == '4'){
                            $('#modal-set-font').show().val(that.model.get('customfont'));
                        }
                    })
                    .on('hidden',function(){
                        $setting.unbind();
                        $('.modify-theme').removeClass('modal-theme-selected');
                        $('.modal-font-size li').removeClass('font-theme-selected');
                        $('#modal-set-font').hide();
                        that.model.set({title:$setting.attr('data-title')});
                        that.model.set({theme:$setting.attr('data-themeid')});
                        that.model.set({fonttheme:$setting.attr('data-fonttheme')});
                        that.model.set({customfont:$setting.attr('data-customfont')});
                    })
                    .delegate('#modal-save-btn','click',function(e){
                        e.preventDefault();
                        var  title = $('#modal-title').val();
                        if(title){
                            $setting.attr('data-title',title);
                            var id = $setting.find('.modal-theme-selected').attr('data-themeid');
                            var font = $setting.find('.font-theme-selected').attr('data-fonttheme');
                            var customfont = $('#modal-set-font').val();
                            if(font == '4' && customfont){
                                $setting.attr('data-customfont',customfont);
                                $setting.attr('data-themeid',id);
                                $setting.attr('data-fonttheme',font);
                                $setting.modal('hide');
                            }if(font != '4'){
                                $setting.attr('data-themeid',id);
                                $setting.attr('data-fonttheme',font);
                                $setting.modal('hide');
                            }
                        }
                    })
                    .delegate('#modal-title','keyup',function(e){
                        if(e.keyCode == 13){
                            $('#modal-save-btn').trigger('click');
                        }
                    })
                    .delegate('#modal-cancel-btn','click',function(e){
                        e.preventDefault();
                        $setting.modal('hide');
                    })
                    .delegate('.modify-theme','click',function(){
                        $('.modify-theme').removeClass('modal-theme-selected');
                        $(this).addClass('modal-theme-selected');
                    })
                    .delegate('.modal-font-size li','click',function(){
                        $('#modal-set-font').hide();
                        $('.modal-font-size li').removeClass('font-theme-selected');
                        $(this).addClass('font-theme-selected');
                    })
                    .delegate('#font-theme-custom','click',function(){
                        var customfont = that.model.get('customfont');
                        $('#modal-set-font').show().val(customfont).select();
                    })
                    .delegate('#modal-set-font','keydown',function(e){
                        if(e.keyCode == 13){
                            $('#modal-save-btn').trigger('click');
                        }
                        if((e.keyCode<48 || e.keyCode>57) && e.keyCode != 8){
                            e.preventDefault();
                        }
                    })
            }
        }
        ,contentChange:function(e){
            var $node = $(this.el).find('.note-content');
            var val = $node.html();
            this.model.set({content:val})
        }
        ,changeScaleAndContentHeight:function(view){
            var $ele = $(view.el);
            var scale = {width:$ele.width(),height:$ele.height()}
            var contentHeight = $ele.find('.note-content').height();

            view.model.set({scale:scale});
            view.model.set({contentHeight:contentHeight});
        }
        ,bringNoteToContainer:function(view){
            var $ele = $(view.el);
            var oriTop = parseInt($ele.css('top'),10)
            var oriLeft = parseInt($ele.css('left'),10)
            var pageWidth = $('body').width();
            var right = pageWidth - ($ele.width());

            oriTop = oriTop<10 ? 10 : oriTop;

            if(oriLeft<10){
                oriLeft = 10;
            }else if(oriLeft>right){
                oriLeft = right-10
            }

            view.model.set('position',{left:oriLeft,top:oriTop});
            $ele.animate({left:oriLeft,top:oriTop});
        }
        ,bringNoteToFront:function($ele){
            var largestIndex = 1;
            $('.note').each(function(index,item){
                var currentZ = parseInt($(item).css('z-index'),10)||1;
                largestIndex = currentZ > largestIndex ? currentZ : largestIndex;
                $(item).removeClass('note-selected');
            });
            $ele.css('z-index',largestIndex+1);
            $ele.addClass('note-selected');
        }
    });

    var appView = Backbone.View.extend({
        el:$('#container')
        ,initialize:function(){
            this.collection.bind('add',this.addOne,this);
            this.collection.bind('reset',this.addAll,this);
            Notes.fetch();
        }
        ,render:function(){
            return this;
        }
        ,initOne:function(note){
            var view = new NoteView({model:note});
            var ele = view.render().el
            $('#container').append(ele)
            view.bringNoteToContainer(view)
            return ele;
        }
        ,addOne:function(note){
            var ele = this.initOne(note);
            $(ele).addClass('animated bounceIn');
            setTimeout(function(){
                $(ele).removeClass('animated bounceIn');
            },600);
        }
        ,addAll:function(){
            var that = this;
            var length = Notes.models.length;
            $.each(Notes.models,function(index,item){
                that.initOne(item)
            });
        }
    });

    var app = new appView({collection:Notes});
    $(document).bind('dblclick',function(e){
        e.preventDefault();
        if(e.target==$('html')[0]){
            Notes.create({position:{top:e.pageY,left:e.pageX}});
        }
    });

    function checkForNotify(item){
        var info = localStorage.getItem('notty-sysinfo');
        if(!info){
            localStorage.setItem('notty-sysinfo',item+'--');
            return false;
        }else{
            var reg = new RegExp(item)
            if(reg.test(item)){
                return true;
            }else{
                info += item+'--';
                localStorage.setItem('notty-sysinfo',info);
                return false;
            }
        }
    }
    if(!checkForNotify('first_run')){
        Notes.create({position:{top:100,left:300},scale:{width:400,height:300},title:'Read Me',content:'Double click on the background to add new notes.<div><br></div><div>Click on the note title to change it and set up the single note\'s background.</div><div><br></div><div>Click on the lock icon to prevent the note from changing and deleting.</div>'});
    }
});
