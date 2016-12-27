import Ember from "ember";
import Protected from "ambitious-oc-news/mixins/protected";
import ActivateDeactivate from "ambitious-oc-news/mixins/activate-deactivate-view";

const {
  get,
  set,
  inject,
  RSVP
} = Ember;

export default Ember.Route.extend(Protected, ActivateDeactivate, {

  display: {
    activate: 'content',
    deactivate: 'content'
  },

  auth: inject.service(),

  config: inject.service('configuration'),

  model() {

    Ember.debug('>>>> Settings::model()');

    let articleSettings = Ember.Object.create(
      get(
        this, 'config').retrieve('article_settings',
        {allowEmbedded: false}
      )
    );

    return RSVP.hash({
      conn: Ember.Object.create(get(this, 'config').retrieve('oc_conn')),
      feed: Ember.Object.create({}),
      folders: this.store.findAll('folder'),
      articleSettings: articleSettings
    });
  },

  renderTemplate() {

    return this.render('settings', {
      into: "application",
      outlet: "content"
    });

  },

  actions: {

    setupConnection(model) {
      set(model, 'success', null);
      set(model, 'error', null);

      const oldUsername = get(get(this, 'config').retrieve('oc_conn'), 'username');
      //let model = get(this, 'currentModel');
      let {domain, username, password, persist} = model.getProperties('domain', 'username', 'password', 'persist');
      //console.log('route.js:setupConnection', model);
      const auth = get(this, 'auth');

      const options = {
        username: username,
        password: password,
        persist: persist,
        domain: domain
      };

      auth.authorize(options).then((success) => {

        set(model, 'success', success);
        if (oldUsername !== username) {
          get(this, 'config').remove('folders');
        }
        this.store.unloadAll();
      }, error => {
        set(model, 'error', error);
      });

      return false;
    },

    /**
     *
     * @param name
     * @returns {*}
     **/
    createFolder(name) {
      return this.store.createRecord('folder', {name: name});
    },

    createFeed(model) {
      set(model, 'success', false);
      set(model, 'error', false);

      if (!get(model, 'url')) {
        set(model, 'error', 'Enter an url.');
        return;
      }

      let feed = this.store.createRecord('feed', {
        url: get(model, 'url')
      });

      let withOrWithoutFolder = new RSVP.Promise((resolve, reject) => {
        const folder = get(model, 'folder');
        if (folder && get(folder, 'isNew')) {
          folder.save().then((folder) => {
            feed.set('folder', folder);
          }, error => {
            reject(error);
          });
        } else {
          feed.set('folder', folder);
        }
        resolve(feed);
      });

      withOrWithoutFolder.then((feed) => {

        feed.save().then((feed) => {
          set(model, 'success', {
            id: get(feed, 'id'),
            title: get(feed, 'title'),
            feedIcon: get(feed, 'feedIcon')
          });
        }, error => {
          set(model, 'error', error);
        });

      });
    },

    /**
     *
     * @param settings
     */
    saveArticleSettings(allow) {
      Ember.debug(`>>>> settings/route::saveArticleSettings(${allow})`);

      let model = this.get('currentModel');
      set(model, 'articleSettings', allow);
      get(this, 'config').store('article_settings', JSON.stringify(allow), 'local');
    },
  }
})
;
