import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image } from 'react-native';
import DeliveryMap from '../src/components/customer/DeliveryMap';

const render = async element => {
  let tree;
  await act(async () => { tree = renderer.create(element); });
  return tree;
};

test('the Mapbox image is shown when the API provides one, and the illustration takes over if it fails', async () => {
  const source = { uri: 'http://api/maps/orders/1?v=a', headers: { Authorization: 'Bearer x' } };
  const tree = await render(<DeliveryMap eta="12 min" mapSource={source} />);
  const image = tree.root.findByType(Image);
  expect(image.props.source).toBe(source);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Illustrated delivery route')).toHaveLength(0);
  await act(async () => image.props.onError());
  expect(tree.root.findAllByType(Image)).toHaveLength(0);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Illustrated delivery route').length).toBeGreaterThan(0);
  // A new map version (for example after a status change) tries Mapbox again.
  await act(async () => tree.update(<DeliveryMap eta="12 min" mapSource={{ ...source, uri: 'http://api/maps/orders/1?v=b' }} />));
  expect(tree.root.findAllByType(Image)).toHaveLength(1);
  await act(async () => tree.unmount());
});

test('without a map source the offline illustration is used', async () => {
  const tree = await render(<DeliveryMap arrived />);
  expect(tree.root.findAllByType(Image)).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).toContain('Delivered');
  await act(async () => tree.unmount());
});
