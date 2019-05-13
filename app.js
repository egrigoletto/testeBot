var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var app = express();

//o token é obtido ao criar a página no facebook
var token = "EAAExz3RcFc8BAMQ2aJzUPJeDBJb6FqHTHW2PTjDGF0PZAcjs6LdmvQ1lfe4oj1Tlf3MUa1F0EsqB75sV7zjVe51IC6O1JCZB3KnSLfdY6yrAUiBVE5mAWGKyHmbK1HKHvRB51kI8R8ZAUPyscEZBP2dYIlhtJ5Vw4r95H0GmJAZDZD";
var host = (process.env.VCAP_APP_HOST || 'localhost');
var port = (process.env.VCAP_APP_PORT || 3000);
app.listen(port, host);

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

//Aqui eu mapeio estados possíveis do meu chamado, com eles eu posso direcionar a conversa, são uma espécie de contexto
var _estados = [];
var _acao = [];
var _resText = [];
var _resImg = [];
var _resImgLeg = [];

//Caminho para receber get 
app.get('/webhook', function(req, res){
    //tenta fazer um pacto com o fb pelo subscribe da requisição, se esse subscribe tiver a senha que eu setei no fb, ok
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'senhadofb')
    {
        console.log('validação ok!');
        //se a cada 24 horas o fb não receber um status 200, ele derruba sua aplicação
        res.status(200).send(req.query['hub.challenge']);
    }
    else
    //outra aplicação tentando acessar o webhook
    {
        console.log('validação falhou!');
         res.sendStatus(403);
    }
});

//verifica o webhook, caso o webhook tenha uma mensagem, mapeio quem enviou, pelo sender ID, ele é o controle que evita que eu mande mensagens para usuários errados
app.post('/webhook/', function (req, res) {
	var text = null;
	var postback = null;
    messaging_events = req.body.entry[0].messaging;
	for (i = 0; i < messaging_events.length; i++) {	
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;

        //Aqui eu mapeio a mensagem enviada e a trato pela função handelMessage
        //A função handlePayload, manipula o que vai ser enviado ao usuário baseado num clique ou no que ele coleta
        if (event.message) {
            text = event.message.text;
            handleMessage(sender,text);
		}else if (event.postback) {
            payload = event.postback.payload;
            handlePayload(sender,payload);
		}else{
			break;
		}
    }
    res.sendStatus(200);
});

function handleMessage(sender,text_)
{
    var chkText = null;
    var sendMenufirst = null;
    var count = 0;
    senderId = sender;
    text_ = text_.substring(0, 319);
    chkText = text_.toLowerCase();
    //toda vez que eu executo uma ação qualquer, eu incluo dentro do array de estados o meu sender Id, assim sei que o usuário, pela conversa inseriu uma informação lá
    if (!_estados[senderId] && !_acao[senderId])
    {
        //os tratamentos abaixo, tratam uma mensagem digitada pelo usuário
        if(chkText == "erro" || chkText =="1" || chkText == "estou com um erro")
        {
            msg = "Erros podem estar associados a divrersas causas...";
            messageData = {	text: msg };
            sendMessage(senderId, messageData);
            //cria um link para chamar o atendente por um canal, como zendesk  
            sendAttendantButton(senderId);
            setTimeout(function ()
            {
                showOptionsMenu(senderId);
            }, 2500);
        }
        else if(chkText == "rejeicao" || chkText == "rejeição" ||chkText =="2" || chkText == "rrejeição nf=-e") 
        {
            msg = "Por gentileza, informe a rejeição a ser analizada...";
            messageData = {	text: msg };
            sendMessage(senderId, messageData);
            _acao[senderId] = "rejeicao";
        }
        else if(chkText == "como usar" || chkText == "uso" ||chkText =="3") 
        {
            msg = "Em nosso canal você irá aprender de forma rápida e simples, como configurar o seu sistema, use sem moderação ;).";
            messageData = {	text: msg };
            sendMessage(senderId, messageData);
            sendVideoTemplate(senderId);
            setTimeout(function ()
            {
                showOptionsMenu(senderId);
            }, 2500);
        }

    }
    //saudação/despedida
    if (chkText == "oi" || chkText == "oi flyzinho")
    {
        text_ = "Oi :D! Tudo bem com você? Quando estiver pronto, digite começar!";
        messageData = {	text: text_ };
        sendMessage(senderId, messageData);
    }
    else if (chkText == "tchau")
    {
        text_ = "Obrigado por usar a ajuda do Flyzinho, estarei sempre aqui se precisar, basta chamar, bye bye :D";
    }
    else if (chkText == "ajuda")
    {
        text_ = "Que tipo de ajuda necessita?";
        messageData = {	text: text_ };
        sendMessage(senderId, messageData);
        sendSelectMenu(senderId);
    }
    else if (chkText == "comecar" || chkText == "começar")
    {
        text_ = "Ok vamos começar!";
        messageData = {	text: text_ };
        sendMessage(senderId, messageData);
        sendSelectMenu(senderId);
    }
    else if (chkText == "recomecar" || chkText == "recomeçar")
    {
        text_ = "Tudo bem, vamos recomeçar então:";
        messageData = {	text: text_ };
        sendMessage(senderId, messageData);
        sendSelectMenu(senderId);

    }
    else if (chkText == "sim" && _estados[senderId] == 'options_menu')
    {
        text_ = "Ok, e lá vamos nós";
        messageData = {	text: text_ };
        sendMessage(senderId, messageData);
        sendSelectMenu(senderId);
    }
    else if ((chkText == "nao" || chkText == "não") && _estados[senderId] == 'options_menu')
    {
        text_ = "Obrigado por usar a ajuda do Flyzinho, estarei sempre aqui se precisar, basta chamar, bye bye :D";
        messageData = {	text: text_ };
        sendMessage(senderId, messageData);
        _estados[senderId] = null;
        _acao[senderId] = null;
    }
    else if (_acao[senderId] == "rejeicao")
    {
        text_ = "Me deixe pensar...";
        anaReject(chkText,senderId); 
    }
    else if (_acao[senderId] == "menu")
    {
        if (chkText == "me diga" || chkText == "mediga" || chkText == "me diga!")
        {
            count = 0;
            intervalSend(_resText, count, senderId)
        }
        else if (chkText == "me mostre" || chkText == "memostre" || chkText == "me mostre!")
        {
            sendList(senderId, _resImg, _resImgLeg);
            msg = "Não se esqueça de excluir o documento, criá-lo novamente e retransmitir a nota";
            messageData = {	text: msg };
            setTimeout(function ()
            {
                sendMessage(senderId, messageData);
                showOptionsMenu(senderId);
            }, 2500);
        }
        else
        {
            text_ = ":( Desculpe, eu não entendi o que quis dizer. Podemos tentar novamente se quiser. Estou a disposição!";
            messageData = {	text: text_ };
            sendMessage(senderId, messageData);
        }
    }
    //caso se inclua algo que o bot não entendeu
    else
    {
        text_ = ":( Desculpe, eu não entendi o que quis dizer. Podemos tentar novamente se quiser. Estou a disposição!";
        messageData = {	text: text_ };
        sendMessage(senderId, messageData);
        _estados[senderId] = null;
        _acao[senderId] = null;
    }
};

//manipula resposta e envia algo na tela de acordo com o que foi enviado pelo usuário
function handlePayload(sender,payload)
{
    senderId = sender;
    var msg = null;
    var count = null;
    var elements = null;
    var itens = null;
    switch(payload)
    {
        case "clicou_comecar":
            msg = "Em que posso ajudar?";
            messageData = {	text: msg };
            sendMessage(senderId, messageData);
            sendSelectMenu(senderId);
        break
        case "suporte_erro":
            msg = "Erros podem estar associados a divrersas causas...";
            messageData = {	text: msg };
            sendMessage(senderId, messageData);
            sendAttendantButton(senderId);
            setTimeout(function ()
            {
                showOptionsMenu(senderId);
            }, 2500);
        break 
        case "suporte_rejeicao":
            msg = "Por gentileza, informe a rejeição a ser analisada...";
            messageData = {	text: msg };
            sendMessage(senderId, messageData);
            _acao[senderId] = "rejeicao";
        break
        case "suporte_uso":
            msg = "Em nosso canal você irá aprender de forma rápida e simples, como configurar o seu sistema, use sem moderação ;).";
            messageData = {	text: msg };
            sendMessage(senderId, messageData);
            sendVideoTemplate(senderId);
            setTimeout(function ()
            {
                showOptionsMenu(senderId);
            }, 2500);
        break
        case "menu_sim":
            msg = "Ok, e lá vamos nós";
            messageData = {	text: msg };
            sendMessage(senderId, messageData);
            sendSelectMenu(senderId);
        break
        case "menu_nao":
            msg = "Obrigado por usar a ajuda do Flyzinho, estarei sempre aqui se precisar, basta chamar, bye bye :D";
            messageData = {	text: msg };
            sendMessage(senderId, messageData);
            _estados[senderId] = null;
            _acao[senderId] = null;
        break 
        //Se eu seleciono no botão "me diga", mostro um texto
        case "me_diga":
            count = 0;
            intervalSend(_resText, count, senderId);
            _acao[senderId] = "rejeicao";
        break
        //Se eu seleciono no botão "me mostre", mostro imagens em intervalos curtos
        case "me_mostre":
            sendList(senderId, _resImg, _resImgLeg);
            msg = "Não se esqueça de excluir o documento, criá-lo novamente e retransmitir a nota";
            messageData = {	text: msg };
            setTimeout(function ()
            {
                sendMessage(senderId, messageData);
                showOptionsMenu(senderId);
            }, 2500);
            _acao[senderId] = "rejeicao";
        break
        default:
    };
};

/* 
A partir desse ponto são chamados 
*/

function sendSelectMenu(senderId)
{
    sender = senderId;
    messageData = {	
        attachment: {
            type: "template",
            payload: {
                template_type:"button",
                text: "Selecione a opção abaixo",
                buttons: [
                    {
                        type: 'postback',
                        title: 'Estou com um erro.',
                        payload: 'suporte_erro'
                    },
                    {
                        type: 'postback',
                        title: 'Rejeição NF-E',
                        payload: 'suporte_rejeicao'
                    },
                    {
                        type: 'postback',
                        title: 'Como usar o first???',
                        payload: 'suporte_uso'
                    },
                ]
            }
        } 
    };
    sendMessage(sender, messageData);
};

//menu de opções
function showOptionsMenu(sender)
{
    senderId = sender;
    messageData = {	text: "Espero ter ajudado..." };
    _estados[senderId] = 'options_menu';
    sender = senderId;
    messageData = {	
        attachment: {
            type: "template",
            payload: {
                template_type:"button",
                text: " Posso te ajudar com algo mais? :D",
                buttons: [
                    {
                        type: 'postback',
                        title: 'Sim',
                        payload: 'menu_sim'
                    },
                    {
                        type: 'postback',
                        title: 'Não',
                        payload: 'menu_nao'
                    }
                ]
            }
        } 
    };
    sendMessage(sender, messageData);
};

//chama atendente
function sendAttendantButton(senderId)
{
    sender = senderId;
    messageData = {	
        attachment: {
            type: "template",
            payload: {
                template_type:"button",
                text: "Para ajudar você a ter a solução que precisa, vou chamar um amigo atendente.",
                buttons: [
                    {
                        type: 'web_url',
                        url: 'http://suporte.fly01.com.br/chat/index.html?name=admin&email=&product=Fly01%20Manufatura',
                        title: 'Falar com atendente'
                    }
                ]
            }
        } 
    };
    sendMessage(sender, messageData);
};

//Envia um link para o youtube incorporado a api
function sendVideoTemplate(senderId)
{
    sender = senderId;
    messageData = {
        attachment:{
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title:'Acesse o canal TOTVS Small',
                  image_url: 'https://www.effortt.com.br/wp-content/uploads/2016/01/totvs.png',
                  subtitle: 'Playlist TOTVS Small',
                  default_action: {
                    type: 'web_url',
                    url: 'https://www.youtube.com/watch?v=34z5hpgpmns&list=PLFAdFcnH-6WspPiXyWTQRAjE2mIOTR1Tx'
                  }
                }
              ]
            }
          }
    };
      sendMessage(sender, messageData);
};

//através da api gráfica do facebook envio uma lista de imagens
function sendList(senderId, _resImg, _resImgLeg)
{
    sender = senderId;
    messageData = {
        attachment:{
            type: "template",
            payload: {
              template_type: "list",
              top_element_style: "compact",
              elements: [
                {
                  title:_resImgLeg[0],
                  image_url: _resImg[0],
                  buttons: [
                    {
                        title: "Visualizar",
                        type: "web_url",
                        url: _resImg[0],
                    }
                  ]
                },
                {
                  title:_resImgLeg[1],
                  image_url: _resImg[1],
                  buttons: [
                    {
                          title: "Visualizar",
                          type: "web_url",
                          url: _resImg[1],
                    }
                  ]
                },
                {
                    title:_resImgLeg[2],
                    image_url: _resImg[2],
                    buttons: [
                      {
                          title: "Visualizar",
                          type: "web_url",
                          url: _resImg[2],
                      }
                  ]
                },
                {
                    title:_resImgLeg[3],
                    image_url: _resImg[3],
                    buttons: [
                        {
                            title: "Visualizar",
                            type: "web_url",
                            url: _resImg[3],
                        }
                    ]
                }
              ]
            }
          }
    };
    sendMessage(sender, messageData);
};

//Crio um array de imagens e um de texto para cada uma das opções de dizer e mostrar
function anaReject(chkText,senderId)
{
    switch (chkText)
    {
        case "600":
            msg = "A rejeição é \"\CSOSN incompatível na operação com Não Contribuinte\"\ \r";
            msg += "Posso te dizer ou te mostrar como resolver esse problema";
            _resText = [
                "Primeiro, acesse no First o menu Cadastro > Básico > Cliente. Lá verifique os campos, Tipo, Insc. Estad. e Contribuinte ICMS.",
                "O Tipo, deve ser  Cons.Final, o campo Insc. Estad. deve estar vazio e o campo Contribuinte ICMS deve ser não",
                "Segundo, acesse no First o menu Cadastro > Básico > Tipo de Entrada e Saída e acesse a TES da nota que foi rejeitada",
                "Acesse a aba ICMS e lá o campo CSON",
                "Preencha ou altere o campo com um desses valores a seguir conforme sua necessidade:",
                "102 - Tributação SN sem permissão de crédito, 103 - Tributação SN, com isenção para faixa de receita bruta, 300 - Imune, 400 - Não tributada pelo Simples Nacional, 500 - ICMS cobrado anteriormente por substituição tributária ou por antecipação.",
                "Terceiro: excluir o documento de saída ou entrada gerado",
                "Por fim, refaça o documento e transmita a nota novamente." 
            ];
            _resImg = [
                "https://drive.google.com/open?id=17_Rt4X91fffqZEmrcht807xngg3XHvr-",
                "https://drive.google.com/open?id=1MnAoBS9I8tSZAVtJdTp4y7YkejNHhQrq",
                "https://drive.google.com/open?id=1IIWdpiYrA3JLU0brZHBd-FemeIH-Msxk",
                "https://drive.google.com/open?id=1xosguB9KuTcILoj0vBmpMoScu6BVF1q0"
            ];
            _resImgLeg = [
                "Acesse Cadastro > Básico > Cliente",
                "Execute as alterações de cadastro",
                "Acesse Cadastro > Básico > Tipo de Entrada e Saída",
                "Inclua a CSON correta dentre as em destaque",
            ];
            _acao[senderId] = "menu";
            messageData = {	text: msg };
            sendMessage(sender, messageData);
            showSolutionMenu(senderId);
        break
        default:
            msg = "Não sei qual rejeição é essa...";
            msg += "Mas vou estudar a respeito e poderei te ajdar no futuro.";
            msg += "Vou pedir ajuda para um amigo para te reponder ok?";
            messageData = {	text: msg };
            sendMessage(sender, messageData);
            sendAttendantButton(senderId);
            showOptionsMenu(senderId);
        break
    }
};

function showSolutionMenu(senderId)
{
    sender = senderId;
    messageData = {	
        attachment: {
            type: "template",
            payload: {
                template_type:"button",
                text: "Como gostaria que te ajudasse?",
                buttons: [
                    {
                        type: 'postback',
                        title: 'Me diga!',
                        payload: 'me_diga'
                    },
                    {
                        type: 'postback',
                        title: 'Me mostre!',
                        payload: 'me_mostre'
                    }
                ]
            }
        } 
    };
    sendMessage(sender, messageData);
};
//envia mensagens em intrvalos curtos para não dar a ideia de mensagens instantâneas que podem dificultar a leitura
function intervalSend(_resText, count, senderId)
{

    messageData = {	text: _resText[count] };                        
    sendMessage(senderId, messageData);
    count++;
                            
    if (_resText.length > count)
    {
        setTimeout(function ()
        {
            intervalSend(_resText, count, senderId);
        }, 5000);
    }
    else 
    {
        showOptionsMenu(senderId);
    } 
};


//envia a mensagem através da api gráfica do facebook
function sendMessage(senderId, messageData) 
{
    messaging_type =  "RESPONSE";
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            messaging_type : messaging_type,
            recipient: { id: senderId },
            message: messageData,
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
};