function doGet(e) {
  var id = (e && e.parameter && e.parameter.id) ? e.parameter.id : '960679194075945603';
  var params = load(id);
  var rss = make(params['items'], params['info']);
  
  return ContentService.createTextOutput(rss)
                       .setMimeType(ContentService.MimeType.RSS);
}

function load(id) {
  var info = {};
  var items = [];
  
  info['link'] = 'https://daichkr.hatelabo.jp/antenna/' + id;
  
  // Load html
  var res = UrlFetchApp.fetch(info['link']);
  var html = res.getContentText();
  info['title'] = html.match(/<title>([\s\S]*?)<\/title>/i)[1];
  info['description'] = html.match(/<meta\s*property="og:description"\s*content="([\s\S]*?)"/i)[1];
  
  // Load json
  var res = UrlFetchApp.fetch(info['link'] + '/recent_feeds.json');
  var html = JSON.parse(res.getContentText()).html;
  // Parse HTML as XML
  html = html.replace(/(<(img)[^>]*>)/ig, "$1</$2>");
  var dom = XmlService.parse('<root>' + html + '</root>').getRootElement();
  
  // PublishedTime
  info['pubDate'] = dom.getChild('time').getAttribute('datetime').getValue();
  
  // Get items
  var sites = dom.getChildren('div').filter(function(item, index){
    var class = item.getAttribute('class').getValue();
    return (class.match(/js-feed/i));
  });
  
  sites.forEach(function(node) {
    var siteTitle = node.getChild('h4').getChildText('a');
    var container = node.getChild('div');
    container.getChildren('div').forEach(function(node) {
      var item = {};
      node = node.getChild('a');
      
      var item = {
        link       : node.getAttribute('href').getValue(),
        title      : node.getChildText('h5'),
        pubDate    : node.getChild('h5').getChildText('span'),
        description: node.getChildText('p')
      };
      
      item['title']   = item['title']  + '[' + siteTitle + ']';
      item['pubDate'] = item['pubDate'].replace(/(\[|\])/g, '').replace(/-/g, '/');
      item['pubDate'] = new Date(item['pubDate'] + '\x20+0900')
      item['pubDate'] = item['pubDate'].toISOString().replace(/\.\d{3}/, '');
      
      items.push(item);
    });
  });
  
  return {items: items, info: info};
}

function make(items, info) {
  var rss = XmlService.createElement('rss')
                      .setAttribute('version', "2.0");
  var channel = XmlService.createElement('channel');
  
  Object.keys(info).forEach(function(key) {
    var elem = XmlService.createElement(key)
                         .setText(info[key]);
    channel.addContent(elem);
  });
  
  Object.keys(items).forEach(function(key) {
    var item = items[key];
    var itemElem = XmlService.createElement('item');
    Object.keys(item).forEach(function(key){
      var elem = XmlService.createElement(key)
                           .setText(item[key]);
      itemElem.addContent(elem);
    });
    channel.addContent(itemElem);
  });
  
  rss.addContent(channel);
  
  var rssStr =
      XmlService.getPrettyFormat().format(XmlService.createDocument(rss));
  return rssStr;
}
