import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveEventProtocol,
  buildEventTypePath,
  collectMatchedEventNames,
  matchPluginEvent
} from '../../lib/plugins/event-match.js';

const EVENT_MAP = {
  message: ['post_type', 'message_type', 'sub_type'],
  notice: ['post_type', 'notice_type', 'sub_type'],
  request: ['post_type', 'request_type', 'sub_type'],
  device: ['post_type', 'event_type', 'sub_type']
};

describe('event-match', () => {
  it('message 命中全通道；onebot.message 仅 protocol=onebot', () => {
    const qq = {
      post_type: 'message',
      message_type: 'private',
      sub_type: 'friend',
      protocol: 'onebot',
      adapter: 'QQ'
    };
    const web = {
      post_type: 'device',
      event_type: 'message',
      protocol: 'device',
      adapter: 'device'
    };
    const qqNames = collectMatchedEventNames(qq, { eventMap: EVENT_MAP });
    const webNames = collectMatchedEventNames(web, { eventMap: EVENT_MAP });

    assert.ok(qqNames.includes('message'));
    assert.ok(qqNames.includes('onebot.message'));
    assert.ok(webNames.includes('message'));
    assert.ok(webNames.includes('device.message'));
    assert.equal(webNames.includes('onebot.message'), false);

    assert.equal(matchPluginEvent(qq, 'message', { eventMap: EVENT_MAP }), true);
    assert.equal(matchPluginEvent(web, 'message', { eventMap: EVENT_MAP }), true);
    assert.equal(matchPluginEvent(qq, 'onebot.message', { eventMap: EVENT_MAP }), true);
    assert.equal(matchPluginEvent(web, 'onebot.message', { eventMap: EVENT_MAP }), false);
  });

  it('protocol / e.events 为任意字符串，无白名单', () => {
    const e = {
      post_type: 'message',
      message_type: 'group',
      sub_type: 'normal',
      protocol: 'telegram',
      events: ['order.created', 'shop.ping']
    };
    const names = collectMatchedEventNames(e, { eventMap: EVENT_MAP });
    assert.ok(names.includes('telegram.message'));
    assert.ok(names.includes('order.created'));
    assert.ok(names.includes('shop.ping'));
    assert.equal(matchPluginEvent(e, 'order.created', { eventMap: EVENT_MAP }), true);
    assert.equal(resolveEventProtocol(e), 'telegram');
  });

  it('路径前缀与通配', () => {
    const e = {
      post_type: 'message',
      message_type: 'group',
      sub_type: 'normal',
      protocol: 'onebot'
    };
    const path = buildEventTypePath(e, EVENT_MAP);
    assert.equal(path, 'message.group.normal');
    assert.equal(matchPluginEvent(e, 'message.group.*', { eventMap: EVENT_MAP }), true);
    assert.equal(matchPluginEvent(e, 'message.private.*', { eventMap: EVENT_MAP }), false);
  });

  it('stdin asMessage 无 path 时仍匹配 message', () => {
    const e = { adapter: 'stdin', protocol: 'stdin' };
    const names = collectMatchedEventNames(e, { eventMap: EVENT_MAP, asMessage: true });
    assert.ok(names.includes('message'));
    assert.ok(names.includes('stdin.message'));
  });
});
