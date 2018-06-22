/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*
* jQuery Telephony Bridge
* @author : Adhi Setyawan @cheanizer
*/
(function ( $ ) {
    var Telesock = function(opt)
    {
    	var def = {
            url : 'ws://localhost:8080',
            socketconnected : null,
            host : '',
            extension : '',
            password : ''
    	};
    	this.options = $.extend(def, opt || {});
        this.statuses = {
            socket : 'disconnected',
            ippbx : 'disconnected'
        };
        this.call = {
            id : null,
            active : false,
            status : 'empty'
        };
        this.ws = null;
        var self  = this;
        //method
    	this._api = (function(){
    		return {
    			connect : function(){
                    return $.extend(self._api, self._connect.apply(self,[]));
    			},
                initialize : function(){
                    return $.extend(self._api, self._initialize.apply(self,[]));
                },
                register : function(){
                    return $.extend(self._api, self._register.apply(self,[self.options]));
                },
                answer : function(){
                    return $.extend(self._api, self._answer.apply(self,[]));
                },
                hangup : function(){
                    return $.extend(self._api, self._hangup.apply(self,[]));
                },
                end : function(){
                    return $.extend(self._api, self._end.apply(self,[]));
                },
                call : function(number){
                    return $.extend(self._api, self._call.apply(self,[number]));
                }
    		};
    	})();
    	return this._api;
    };

    Telephony.prototype = {
    	_connect: function()
    	{
    		this.ws = new WebSocket(this.options.url);
            this._bindSocketEvent(this.ws);
    	},
        _call : function(number){
            this.ws.send('call|' + number);
            this.call.active = true;
            this.call.status = 'ringging';
            localStorage.setItem('call',JSON.stringify(this.call));
        },
        _answer : function(){
            this.ws.send('recieve|');
            this.call.active = true;
            this.call.status = 'oncall';
            localStorage.setItem('call',JSON.stringify(this.call));
        },
        _hangup : function(){
            this.call.status = 'hangup';
            this.call.active = true;
            localStorage.setItem('call',JSON.stringify(this.call));
            this.ws.send('terminate|');
        },
        _end :  function(){
            this.call.active = false;
            localStorage.setItem('call',JSON.stringify(this.call));
        },
        _initialize : function(){
            if (this.statuses.socket == 'disconnected')
            {
                this._connect.apply(this,[]);
            }
            var currentCall = JSON.parse(localStorage.getItem('call')); 
            if (currentCall.active)
            {
                this.options.callActive.call(this,currentCall);
            } else this.options.callInactive.call();
            if (currentCall == undefined || currentCall == null || currentCall == '')
            {
                localStorage.setItem('call',JSON.stringify(this.call));
            }
        },
        _register : function(opt){
            if (this.statuses.ippbx != 'connected')
            {
                var command = 'register|' + opt.host + '|' + opt.extension + '|' + opt.password;
                console.log(command);
                this.ws.send(command);    
            }
        },
        _bindSocketEvent : function(ws){
            var self = this;
            $(ws).bind('open',function(){
                if (typeof self.options.sockopen === 'function'){
                    self.options.sockopen();
                }
            }).bind('message',function(event){
                //$.extend(this,self._messageAction.apply(this,[event,self.options]));
                //self._messageAction.apply(this,[event,self.options]);
                self._messageAction(event,self.options);
            }).bind('error',function(event){
                if (typeof self.options.sockerror === 'function'){
                    self.options.sockerror(event);
                }
            });
        },
        _messageAction : function(event,opt)
        {
            var self = this;
            var data = event.originalEvent.data;
            var splited = data.split('|');
            switch (splited[0])
            {
                case "register":
                    if (typeof opt.register === 'function')
                    {
                        opt.register.call(this,splited[1]);
                    }
                break;
                case "status":
                    if (typeof opt.connected === 'function')
                    {
                        opt.connected.call(this,splited[1]);
                    }
                    if (splited[1] == 'connected') self.statuses.ippbx = 'connected';
                break;
                case "call":
                    var mode = splited[1];
                    if (mode == 'incoming')
                    {
                        if (typeof opt.incoming === 'function'){
                            opt.incoming.call(this,splited[2]);
                            self.call.id = splited[2];
                            self.call.status = 'ringging';
                            self.call.active = true;
                            localStorage.setItem('call',JSON.stringify(self.call));
                        }
                    }else if (mode == 'ringging')
                    {
                        if(typeof opt.onringing === 'function')
                        {
                            opt.onringing.call(this,[]);
                        }
                    }else if (mode == 'completed'){
                        var currentCall = JSON.parse(localStorage.getItem('call'));
                        if (currentCall.status == 'ringging')
                        {
                            this.call = {
                                id : null,
                                active : true,
                                status : 'hangup'
                            };
                            localStorage.setItem('call',JSON.stringify(this.call));
                            opt.callCanceled.call(this,this.call);
                        }
                    }else if (mode == 'active')
                    {
                        this.call = {
                            id : this.call.id,
                            active : true,
                            status : 'oncall'
                        };

                        localStorage.setItem('call',JSON,stringify(this.call));
                        if (typeof opt.onActive === 'function'){
                            opt.onActive.call(this,this.call);
                        }
                    }
                break;
            }
        }
    };

    $.extend({
    	telesock : function(opt){
    		return new Telesock(opt);
    	}
    });
    return $.telesock;
}( jQuery ));